import { expect, test } from "@playwright/test";

const SEED_USER = {
	email: "abdullah@example.com",
	password: "password123",
};

test("trace the Add-a-passkey click", async ({ page }) => {
	page.on("console", (m) => console.log(`[console.${m.type()}]`, m.text()));
	page.on("pageerror", (e) => console.log("[pageerror]", e.message));
	page.on("requestfailed", (r) =>
		console.log("[requestfailed]", r.url(), r.failure()?.errorText),
	);
	page.on("response", async (resp) => {
		if (resp.url().includes("/api/users/passkeys")) {
			let body = "";
			try {
				body = (await resp.text()).slice(0, 200);
			} catch {}
			console.log(
				"[resp]",
				resp.status(),
				resp.request().method(),
				resp.url(),
				body,
			);
		}
	});

	await page.goto("/login");
	await page.getByPlaceholder("Enter your email").fill(SEED_USER.email);
	await page.getByPlaceholder("Enter your password").fill(SEED_USER.password);
	await page.getByRole("button", { name: /^sign in$/i }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });

	const client = await page.context().newCDPSession(page);
	await client.send("WebAuthn.enable");
	await client.send("WebAuthn.addVirtualAuthenticator", {
		options: {
			protocol: "ctap2",
			transport: "internal",
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true,
		},
	});

	await page.goto("/settings");
	await expect(
		page.getByRole("button", { name: /add a passkey/i }),
	).toBeVisible();
	await page.getByRole("button", { name: /add a passkey/i }).click();

	// Give the ceremony + verify a chance to complete
	await page.waitForTimeout(8000);
});
