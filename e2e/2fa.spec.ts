import { expect, test } from "@playwright/test";
import { generateTotpToken } from "../src/server/constants/totp";

const SEED_USER = {
	email: "abdullah@example.com",
	password: "password123",
};

async function loginAsSeed(
	page: import("@playwright/test").Page,
): Promise<void> {
	await page.goto("/login");
	await page.getByPlaceholder("Enter your email").fill(SEED_USER.email);
	await page.getByPlaceholder("Enter your password").fill(SEED_USER.password);
	await page.getByRole("button", { name: /sign in/i }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe("2FA TOTP", () => {
	test("setup → enable with valid code → disable", async ({
		page,
		baseURL,
	}) => {
		await loginAsSeed(page);
		const ctx = page.context();
		// The /api/* routes enforce a CSRF Origin/Referer check via
		// withApiHandler → csrfReject. Playwright's APIRequestContext does not
		// auto-attach an Origin header the way a browser fetch does, so we set
		// it explicitly to the dev server origin for every mutating call.
		const origin = new URL(baseURL ?? "http://localhost:3001").origin;
		const csrfHeaders = { Origin: origin };

		const setup = await ctx.request.post("/api/users/2fa/setup", {
			data: {},
			headers: csrfHeaders,
		});
		expect(setup.status()).toBe(200);
		const setupBody = await setup.json();
		const secret: string = setupBody.data.secret;
		expect(secret).toMatch(/^[A-Z2-7]+$/);
		expect(setupBody.data.otpauthUrl).toContain("otpauth://totp/");
		// QR code is returned as a PNG data URL the client renders as an <img>.
		const qrCodeDataUrl: string = setupBody.data.qrCodeDataUrl;
		expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
		expect(qrCodeDataUrl.length).toBeGreaterThan(100);

		// Bad code is rejected
		const bad = await ctx.request.post("/api/users/2fa/enable", {
			data: { token: "000000" },
			headers: csrfHeaders,
		});
		expect(bad.status()).toBe(401);

		// Good code enables 2FA + returns recovery codes
		const validCode = generateTotpToken(secret);
		const good = await ctx.request.post("/api/users/2fa/enable", {
			data: { token: validCode },
			headers: csrfHeaders,
		});
		expect(good.status()).toBe(200);
		const goodBody = await good.json();
		expect(Array.isArray(goodBody.data.recoveryCodes)).toBe(true);
		expect(goodBody.data.recoveryCodes.length).toBeGreaterThan(0);

		// Verify profile shows enabled
		const profile = await ctx.request.get("/api/users/user-profile");
		const profileBody = await profile.json();
		expect(profileBody.data.security.twoFactorEnabled).toBe(true);

		// Wrong password fails disable (must be ≥6 chars to satisfy zod first)
		const disableFail = await ctx.request.post("/api/users/2fa/disable", {
			data: { password: "wrong-password" },
			headers: csrfHeaders,
		});
		expect(disableFail.status()).toBe(401);

		// Correct password disables
		const disable = await ctx.request.post("/api/users/2fa/disable", {
			data: { password: SEED_USER.password },
			headers: csrfHeaders,
		});
		expect(disable.status()).toBe(200);

		const after = await ctx.request.get("/api/users/user-profile");
		const afterBody = await after.json();
		expect(afterBody.data.security.twoFactorEnabled).toBe(false);
	});
});
