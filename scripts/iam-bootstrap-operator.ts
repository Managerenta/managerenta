/**
 * Bootstrap the first platform super-admin (IamOperator).
 *
 * SECURITY: there is no self-service or HTTP path to platform access. This is
 * the ONLY way to mint the first operator, and it is deliberately inconvenient:
 *
 *   - It requires `IAM_BOOTSTRAP_SECRET` to be set in the server env AND passed
 *     as `--secret`, so merely inheriting the env in a shell cannot run it.
 *   - It refuses to run if ANY operator already exists (one-time only). After
 *     the first operator exists, all further operators are managed through IAM.
 *   - It links an EXISTING, already-registered user; it never creates a login.
 *
 * Usage:
 *   IAM_BOOTSTRAP_SECRET=… yarn iam:bootstrap-operator --email you@co.com --secret …
 */
import { timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";
import { connectMongoDB } from "../src/server/databases";
import {
	addMembershipDB,
	countIamOperatorsDB,
	createIamOperatorDB,
	findIamGroupByNameDB,
	seedPlatformSystemPolicies,
} from "../src/server/iam";
import { User } from "../src/server/models";

/** Constant-time secret comparison (avoids leaking length/prefix via timing). */
function secretsMatch(provided: string, expected: string): boolean {
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

function parseArgs(argv: string[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg?.startsWith("--")) {
			const key = arg.slice(2);
			const next = argv[i + 1];
			if (next && !next.startsWith("--")) {
				out[key] = next;
				i++;
			} else {
				out[key] = "true";
			}
		}
	}
	return out;
}

async function run(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const email = (args.email ?? "").trim().toLowerCase();
	const providedSecret = args.secret ?? "";
	const expectedSecret = process.env.IAM_BOOTSTRAP_SECRET ?? "";

	if (!expectedSecret) {
		throw new Error(
			"Refusing to run: IAM_BOOTSTRAP_SECRET is not set in the server env.",
		);
	}
	if (!providedSecret || !secretsMatch(providedSecret, expectedSecret)) {
		throw new Error(
			"Refusing to run: --secret does not match IAM_BOOTSTRAP_SECRET.",
		);
	}
	if (!email) {
		throw new Error("Missing required --email <existing-user-email>.");
	}

	console.log("Connecting to MongoDB…");
	await connectMongoDB();

	const existing = await countIamOperatorsDB();
	if (existing > 0) {
		throw new Error(
			`Refusing to run: ${existing} operator(s) already exist. Bootstrap is one-time; manage further operators through IAM.`,
		);
	}

	// biome-ignore lint/suspicious/noExplicitAny: bypass strict User model typing for a lean lookup.
	const user = await (User as any).findOne({ email }).lean();
	if (!user) {
		throw new Error(
			`No registered user with email "${email}". The user must sign up first.`,
		);
	}
	const userId = user._id.toString();

	console.log("Seeding platform system policies + groups…");
	const seeded = await seedPlatformSystemPolicies();
	if (!seeded) throw new Error("Failed to seed platform system policies.");

	console.log("Creating operator…");
	const operator = await createIamOperatorDB({ payload: { userId } });
	if (!operator) throw new Error("Failed to create operator.");

	const adminGroup = await findIamGroupByNameDB({
		plane: "platform",
		orgId: null,
		name: "platform-admins",
	});
	if (!adminGroup) throw new Error("platform-admins group not found.");

	const membership = await addMembershipDB({
		payload: {
			groupId: adminGroup._id.toString(),
			principalType: "operator",
			principalId: userId,
			orgId: null,
		},
	});
	if (!membership)
		throw new Error("Failed to add operator to platform-admins.");

	console.log(
		`\n✓ Bootstrapped platform super-admin for ${email} (userId ${userId}).`,
	);
	console.log("  Operator added to the platform-admins group.");

	await mongoose.disconnect();
}

run()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(String(err?.message ?? err));
		process.exit(1);
	});
