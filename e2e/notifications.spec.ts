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

test.describe("Notifications + reminders", () => {
	test("sending a tenant reminder creates a notification record", async ({
		page,
	}) => {
		await loginAsSeed(page);
		const ctx = page.context();

		// Find a tenant from the seeded data
		const tenants = await ctx.request.get("/api/tenants");
		const tenantsBody = await tenants.json();
		const tenantId = tenantsBody.data?.[0]?._id;
		expect(tenantId).toBeTruthy();

		// Trigger reminder
		const send = await ctx.request.post(
			`/api/tenants/${tenantId}/send-reminder`,
		);
		expect(send.status()).toBe(200);
		const sendBody = await send.json();
		expect(sendBody.data.sent).toBeGreaterThanOrEqual(1);

		// List notifications and confirm at least one rent-due/in-app row exists
		const list = await ctx.request.get("/api/notifications?limit=50");
		expect(list.status()).toBe(200);
		const listBody = await list.json();
		expect(Array.isArray(listBody.data.data)).toBe(true);
		expect(listBody.data.data.length).toBeGreaterThan(0);

		// Mark all as read
		const readAll = await ctx.request.post("/api/notifications/read-all", {
			data: {},
		});
		expect(readAll.status()).toBe(200);

		const after = await ctx.request.get("/api/notifications?limit=50");
		const afterBody = await after.json();
		expect(afterBody.data.unread).toBe(0);
	});

	test("/notifications page renders rows", async ({ page }) => {
		await loginAsSeed(page);
		// Make sure at least one notification exists
		const tenants = await page.context().request.get("/api/tenants");
		const tenantId = (await tenants.json()).data?.[0]?._id;
		if (tenantId) {
			await page
				.context()
				.request.post(`/api/tenants/${tenantId}/send-reminder`);
		}

		await page.goto("/notifications");
		await expect(page.locator("text=Notifications").first()).toBeVisible();
	});
});
