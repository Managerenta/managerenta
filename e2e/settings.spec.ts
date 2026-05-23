import { expect, test } from "@playwright/test";

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
	await page.getByRole("button", { name: /^sign in$/i }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe("Settings APIs (server-side)", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsSeed(page);
	});

	test("PATCH /api/users/preferences persists currency + dateFormat", async ({
		page,
	}) => {
		const ctx = page.context();
		const patch = await ctx.request.patch("/api/users/preferences", {
			data: { currency: "USD", dateFormat: "MM/DD/YYYY" },
		});
		expect(patch.status()).toBe(200);
		const patchBody = await patch.json();
		expect(patchBody.data.currency).toBe("USD");
		expect(patchBody.data.dateFormat).toBe("MM/DD/YYYY");

		// Verify the profile reflects the change
		const profile = await ctx.request.get("/api/users/user-profile");
		const profileBody = await profile.json();
		expect(profileBody.data.preferences.currency).toBe("USD");
		expect(profileBody.data.preferences.dateFormat).toBe("MM/DD/YYYY");

		// reset for other tests
		await ctx.request.patch("/api/users/preferences", {
			data: { currency: "NGN", dateFormat: "DD/MM/YYYY" },
		});
	});

	test("PATCH /api/users/notifications toggles flags", async ({ page }) => {
		const ctx = page.context();
		const patch = await ctx.request.patch("/api/users/notifications", {
			data: { paymentReceived: false, smsEnabled: true },
		});
		expect(patch.status()).toBe(200);
		const body = await patch.json();
		expect(body.data.paymentReceived).toBe(false);
		expect(body.data.smsEnabled).toBe(true);
		await ctx.request.patch("/api/users/notifications", {
			data: { paymentReceived: true, smsEnabled: false },
		});
	});

	test("PATCH /api/users/reminders updates lead-time", async ({ page }) => {
		const ctx = page.context();
		const patch = await ctx.request.patch("/api/users/reminders", {
			data: { rentDueLeadDays: 5, overdueRepeatDays: 14 },
		});
		expect(patch.status()).toBe(200);
		const body = await patch.json();
		expect(body.data.rentDueLeadDays).toBe(5);
		expect(body.data.overdueRepeatDays).toBe(14);
		await ctx.request.patch("/api/users/reminders", {
			data: { rentDueLeadDays: 3, overdueRepeatDays: 7 },
		});
	});

	test("Preferences UI saves a change", async ({ page }) => {
		await page.goto("/settings?tab=account");
		await page.waitForSelector("text=Preferences", { timeout: 15000 });
		// Use the currency select; pick the GBP option.
		const select = page.locator("select.pref-select").first();
		await select.selectOption("GBP");

		// Toast appears with success. The toast container is rendered by the
		// app's own useToast hook (styled-components, hashed classnames), so
		// match by visible text rather than a brittle class.
		await expect(page.getByText(/preference saved/i)).toBeVisible({
			timeout: 5000,
		});

		// Verify persisted via API
		const profile = await page
			.context()
			.request.get("/api/users/user-profile");
		const body = await profile.json();
		expect(body.data.preferences.currency).toBe("GBP");

		// Reset
		await page.context().request.patch("/api/users/preferences", {
			data: { currency: "NGN" },
		});
	});
});
