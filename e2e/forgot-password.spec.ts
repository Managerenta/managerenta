import { expect, test } from "@playwright/test";

const SEED_USER = {
	email: "abdullah@example.com",
};

test.describe("Forgot password flow", () => {
	test("/forgot-password posts and shows confirmation", async ({ page }) => {
		await page.goto("/forgot-password");
		await page.getByPlaceholder(/you@example.com/i).fill(SEED_USER.email);
		await page.getByRole("button", { name: /send reset link/i }).click();
		await expect(
			page.locator("text=If an account exists for that email"),
		).toBeVisible({ timeout: 10000 });
	});

	test("POST /api/auth/forgot-password is always 200 (no enumeration)", async ({
		request,
	}) => {
		const real = await request.post("/api/auth/forgot-password", {
			data: { email: SEED_USER.email },
		});
		expect(real.status()).toBe(200);

		const fake = await request.post("/api/auth/forgot-password", {
			data: { email: "noone@nowhere.invalid" },
		});
		expect(fake.status()).toBe(200);
	});

	test("POST /api/auth/reset-password rejects an unknown token", async ({
		request,
	}) => {
		const res = await request.post("/api/auth/reset-password", {
			data: {
				token: "deadbeefdeadbeefdeadbeefdeadbeefdead",
				newPassword: "newpassword123",
			},
		});
		expect(res.status()).toBe(400);
	});
});
