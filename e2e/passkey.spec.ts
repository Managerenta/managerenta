import { type CDPSession, expect, test } from "@playwright/test";
import { resetSeedUserToBaseline } from "./support/reset-user";

const SEED_USER = {
	email: "abdullah@example.com",
	password: "password123",
};

// Drive Chrome's virtual WebAuthn authenticator via CDP. Real authenticators
// can't be scripted, so Playwright's only path is the DevTools protocol:
// enable WebAuthn on the page target, add a soft-token authenticator that
// auto-fulfils ceremonies, and let the app exercise the full flow.
async function installVirtualAuthenticator(
	client: CDPSession,
): Promise<string> {
	await client.send("WebAuthn.enable", { enableUI: false });
	const { authenticatorId } = await client.send(
		"WebAuthn.addVirtualAuthenticator",
		{
			options: {
				protocol: "ctap2",
				transport: "internal",
				hasResidentKey: true,
				hasUserVerification: true,
				isUserVerified: true,
				automaticPresenceSimulation: true,
			},
		},
	);
	return authenticatorId;
}

async function login(page: import("@playwright/test").Page): Promise<void> {
	await page.goto("/login");
	await page.getByPlaceholder("Enter your email").fill(SEED_USER.email);
	await page.getByPlaceholder("Enter your password").fill(SEED_USER.password);
	await page.getByRole("button", { name: /^sign in$/i }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

// Hit the GET endpoint and wipe any previously registered passkeys for the
// seed account. The DB persists across runs in this repo, so without a
// reset the "remove" test starts with a stale list and the "register then
// sign in" test risks colliding with an earlier credential.
async function clearAllPasskeys(
	page: import("@playwright/test").Page,
): Promise<void> {
	const list = await (await page.request.get("/api/users/passkeys")).json();
	const items: { credentialId: string }[] = list?.data?.passkeys ?? [];
	for (const p of items) {
		await page.request.delete(
			`/api/users/passkeys/${encodeURIComponent(p.credentialId)}`,
		);
	}
}

test.describe("Passkeys", () => {
	// Mirror the 2FA spec: any failure mid-flow can leave registered passkeys
	// that pollute later runs (every "passwordless sign-in" attempt would
	// match a stale credential the test no longer remembers). Reset the user
	// regardless of outcome.
	test.afterEach(async () => {
		await resetSeedUserToBaseline();
	});

	test("register a passkey, then sign in passwordless with it", async ({
		page,
	}) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") consoleErrors.push(msg.text());
		});

		await login(page);
		await clearAllPasskeys(page);

		// Install the virtual authenticator AFTER login so the CDP target
		// is the post-navigation page, then move to the Security panel.
		const client = await page.context().newCDPSession(page);
		await installVirtualAuthenticator(client);

		await page.goto("/settings");
		await expect(
			page.getByRole("button", { name: /add a passkey/i }),
		).toBeVisible();
		await page.getByRole("button", { name: /add a passkey/i }).click();

		// Poll the GET endpoint instead of scraping the DOM — the toast +
		// SWR refetch can lag a render or two behind the verify response,
		// but the API truth lands as soon as verify returns.
		await expect
			.poll(
				async () => {
					const res = await page.request.get("/api/users/passkeys");
					const j = await res.json();
					return j?.data?.passkeys?.length ?? 0;
				},
				{ timeout: 20000 },
			)
			.toBeGreaterThan(0);

		// Sign out and sign back in via passkey ----------------------
		await page.request.delete("/api/auth/logout");
		await page.context().clearCookies();

		await page.goto("/login");
		await page
			.getByRole("button", { name: /sign in with a passkey/i })
			.click();

		await page.waitForURL(/\/dashboard/, { timeout: 20000 });

		if (consoleErrors.length) {
			// Surface unexpected runtime errors — these would otherwise
			// hide behind a passing assertion if any non-fatal feature
			// regressed during the flow.
			console.log("Browser console errors:", consoleErrors);
		}
	});

	test("remove a passkey", async ({ page }) => {
		await login(page);
		await clearAllPasskeys(page);

		const client = await page.context().newCDPSession(page);
		await installVirtualAuthenticator(client);

		await page.goto("/settings");
		await page.getByRole("button", { name: /add a passkey/i }).click();

		// Wait for the new passkey to land.
		await expect
			.poll(
				async () => {
					const r = await page.request.get("/api/users/passkeys");
					return (await r.json())?.data?.passkeys?.length ?? 0;
				},
				{ timeout: 20000 },
			)
			.toBeGreaterThan(0);

		// Now delete it via the UI.
		const removeBtn = page
			.getByRole("button", { name: /^remove$/i })
			.first();
		await expect(removeBtn).toBeVisible({ timeout: 10000 });
		await removeBtn.click();

		await expect
			.poll(
				async () => {
					const r = await page.request.get("/api/users/passkeys");
					return (await r.json())?.data?.passkeys?.length ?? 0;
				},
				{ timeout: 10000 },
			)
			.toBe(0);
	});
});
