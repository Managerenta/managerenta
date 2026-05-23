// Test-only helper: directly reset known mutable bits on the seed user so a
// failed test in one spec can't poison every later spec. Used by `afterEach`
// hooks. We talk to MongoDB directly because some of the reset paths (like
// disabling 2FA) require the user to be able to log in, and once 2FA is on
// you can't disable it via the API without the TOTP secret.
import mongoose from "mongoose";

let connected = false;

async function connect(): Promise<void> {
	if (connected) return;
	if (!process.env.MONGODB_URI) {
		throw new Error(
			"MONGODB_URI not set. Run tests with the same env the dev server uses.",
		);
	}
	await mongoose.connect(process.env.MONGODB_URI, {
		dbName: process.env.DB_NAME,
	});
	connected = true;
}

export async function resetSeedUserToBaseline(
	email = "abdullah@example.com",
): Promise<void> {
	await connect();
	const users = mongoose.connection.collection("users");
	await users.updateOne(
		{ email },
		{
			$set: {
				"security.twoFactorEnabled": false,
				"security.passkeys": [],
				"preferences.currency": "NGN",
				"preferences.dateFormat": "DD/MM/YYYY",
				"preferences.theme": "system",
				"preferences.language": "en",
				"preferences.timezone": "WAT",
				"notifications.paymentReceived": true,
				"notifications.smsEnabled": false,
				"reminders.rentDueLeadDays": 3,
				"reminders.overdueRepeatDays": 7,
			},
			$unset: {
				"security.totpSecret": "",
				"security.pendingTotpSecret": "",
				"security.recoveryCodes": "",
				currentOrganizationId: "",
			},
		},
	);
}

/**
 * Drop any orgs created by a previous test run so the second user starts
 * each `organizations` test in a clean personal scope (no `currentOrganizationId`,
 * no membership in test-leftover orgs). Doesn't touch real seeded data.
 */
export async function resetOrgTestState(): Promise<void> {
	await connect();
	const users = mongoose.connection.collection("users");
	const orgs = mongoose.connection.collection("organizations");
	await Promise.all([
		users.updateMany(
			{
				email: { $in: ["abdullah@example.com", "amina@example.com"] },
			},
			{ $unset: { currentOrganizationId: "" } },
		),
		// The org test creates orgs with names like `playwright-org-…`.
		// Wipe them so list assertions stay deterministic. A `deleted: true`
		// marker doesn't suffice — the API filters those out by default, but
		// the lingering rows can still break invite lookups.
		orgs.deleteMany({ name: /^playwright-org-/ }),
	]);
}
