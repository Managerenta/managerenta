import { expect, test } from "@playwright/test";

const SEED_USER = {
	email: "abdullah@example.com",
	password: "password123",
};

async function login(page: import("@playwright/test").Page): Promise<void> {
	await page.goto("/login");
	await page.getByPlaceholder("Enter your email").fill(SEED_USER.email);
	await page.getByPlaceholder("Enter your password").fill(SEED_USER.password);
	await page.getByRole("button", { name: /^sign in$/i }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe("Analytics", () => {
	test("page renders KPI cards from seeded data + API returns series", async ({
		page,
	}) => {
		await login(page);
		await page.goto("/analytics");
		await expect(
			page.locator(".title", { hasText: "Analytics" }).first(),
		).toBeVisible();
		await expect(page.getByText("Monthly Revenue").first()).toBeVisible({
			timeout: 15000,
		});
		await expect(
			page.getByText("Revenue vs Expenses").first(),
		).toBeVisible();
		// Data actually loaded: some stat value is populated (5 seeded active
		// tenants) and the revenue chart left its empty state.
		await expect(
			page.locator(".stat-value", { hasText: "5" }).first(),
		).toBeVisible({ timeout: 15000 });
		await expect(page.getByText("No transaction data yet.")).toHaveCount(0);

		const resp = await page
			.context()
			.request.get("/api/analytics?months=6");
		expect(resp.status()).toBe(200);
		const body = await resp.json();
		expect(body.code).toBe(200);
		expect(body.data).toBeTruthy();
		// Data integration bar: seeded rent credits must produce non-zero
		// monthly revenue (regression guard — a `deleted:false` filter on the
		// field-less transactions collection once silently zeroed this).
		const monthly = body.data.monthly as {
			revenue: number;
			expenses: number;
		}[];
		expect(Array.isArray(monthly)).toBe(true);
		const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
		expect(totalRevenue).toBeGreaterThan(0);
	});
});

test.describe("Calendar", () => {
	test("page renders current month and API returns seeded events", async ({
		page,
	}) => {
		await login(page);
		await page.goto("/calendar");
		await expect(
			page.locator(".title", { hasText: "Calendar" }).first(),
		).toBeVisible();
		await expect(
			page.getByText("Rent due", { exact: true }).first(),
		).toBeVisible({ timeout: 15000 });
		// Seeded rentDueDay values put at least one rent-due chip on the
		// current month's grid once data loads.
		await expect(page.locator(".chip").first()).toBeVisible({
			timeout: 15000,
		});

		const now = new Date();
		const resp = await page
			.context()
			.request.get(
				`/api/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
			);
		expect(resp.status()).toBe(200);
		const body = await resp.json();
		expect(body.code).toBe(200);
		// Seed sets rentDueDay for 5 tenants → rent-due events this month
		const events = Array.isArray(body.data) ? body.data : body.data?.events;
		expect(Array.isArray(events)).toBe(true);
		expect(events.length).toBeGreaterThan(0);
	});
});

test.describe("Audit log", () => {
	test("page renders seeded audit events", async ({ page }) => {
		await login(page);
		await page.goto("/audit");
		await expect(
			page.locator(".title", { hasText: "Audit Log" }).first(),
		).toBeVisible();
		await expect(
			page.getByText("Created property Maitama Heights").first(),
		).toBeVisible({ timeout: 15000 });
		await expect(page.getByText("Recorded Events").first()).toBeVisible();

		const resp = await page.context().request.get("/api/audit");
		expect(resp.status()).toBe(200);
		const body = await resp.json();
		expect(
			body.data.total ?? body.data.events.length,
		).toBeGreaterThanOrEqual(5);
	});
});

test.describe("Documents", () => {
	test("list renders seeded documents", async ({ page }) => {
		await login(page);
		await page.goto("/documents");
		await expect(
			page.locator(".title", { hasText: "Documents" }).first(),
		).toBeVisible();
		await expect(
			page.getByText("Lease agreement — Ifeanyi Eze").first(),
		).toBeVisible({ timeout: 15000 });
		await expect(
			page.getByText("Insurance policy — Maitama Heights").first(),
		).toBeVisible();
		await expect(page.getByText("Total Documents").first()).toBeVisible();
	});

	test("API returns seeded documents scoped to owner", async ({ page }) => {
		await login(page);
		const resp = await page.context().request.get("/api/documents");
		expect(resp.status()).toBe(200);
		const body = await resp.json();
		expect(body.data.documents.length).toBeGreaterThanOrEqual(4);
		const names = body.data.documents.map((d: { name: string }) => d.name);
		expect(names).toEqual(
			expect.arrayContaining(["Inspection report — Lekki Villa"]),
		);
	});
});

test.describe("Notifications page", () => {
	test("renders seeded notification rows incl. failed SMS", async ({
		page,
	}) => {
		await login(page);
		await page.goto("/notifications");
		await expect(
			page.locator(".title", { hasText: "Notifications" }).first(),
		).toBeVisible();
		await expect(page.getByText("Rent due soon").first()).toBeVisible({
			timeout: 15000,
		});
		// Failed-delivery state is visible too (seeded failed SMS)
		await expect(
			page.getByText("Overdue rent alert").first(),
		).toBeVisible();
	});
});
