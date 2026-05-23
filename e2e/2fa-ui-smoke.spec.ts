import { expect, test } from "@playwright/test";

const SEED_USER = {
	email: "abdullah@example.com",
	password: "password123",
};

// UI smoke test — verifies the QR <img> actually renders in the Security
// panel when 2FA setup is triggered. Complements 2fa.spec.ts which only
// checks the API response shape.
test.describe("2FA setup UI", () => {
	test("Security panel renders QR code on setup", async ({ page }) => {
		await page.goto("/login");
		await page.getByPlaceholder("Enter your email").fill(SEED_USER.email);
		await page
			.getByPlaceholder("Enter your password")
			.fill(SEED_USER.password);
		await page.getByRole("button", { name: /^sign in$/i }).click();
		await page.waitForURL(/\/dashboard/, { timeout: 15000 });

		await page.goto("/settings");
		// The Settings page hosts the Security panel.
		await page
			.getByRole("button", { name: /set up 2fa/i })
			.click({ timeout: 10000 });

		const qrImg = page.getByAltText("Two-factor authentication QR code");
		await expect(qrImg).toBeVisible({ timeout: 10000 });
		const src = await qrImg.getAttribute("src");
		expect(src).toMatch(/^data:image\/png;base64,/);

		// Naturally-rendered size (CSS may scale, but the data must produce
		// a non-empty raster).
		const dims = await qrImg.evaluate((el) => {
			const img = el as HTMLImageElement;
			return { w: img.naturalWidth, h: img.naturalHeight };
		});
		expect(dims.w).toBeGreaterThan(0);
		expect(dims.h).toBeGreaterThan(0);
	});
});
