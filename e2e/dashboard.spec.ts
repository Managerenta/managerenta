import { expect, test } from "@playwright/test";

const SEED_USER = {
	email: "abdullah@example.com",
	password: "password123",
};

async function login(page: import("@playwright/test").Page): Promise<void> {
	await page.goto("/login");
	await page.getByPlaceholder("Enter your email").fill(SEED_USER.email);
	await page.getByPlaceholder("Enter your password").fill(SEED_USER.password);
	await page.getByRole("button", { name: /sign in/i }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe("Authenticated pages", () => {
	test("dashboard loads + /api/dashboard/stats returns seeded numbers", async ({
		page,
	}) => {
		await login(page);

		// Hit the API directly using the page's cookies
		const ctx = page.context();
		const resp = await ctx.request.get("/api/dashboard/stats");
		expect(resp.status()).toBe(200);
		const body = await resp.json();
		expect(body.code).toBe(200);
		expect(body.data).toBeTruthy();
		// Seed inserted: 3 properties, 9 units, 5 active tenants
		expect(body.data.totalProperties).toBeGreaterThanOrEqual(3);
		expect(body.data.totalUnits).toBeGreaterThanOrEqual(9);
		expect(body.data.totalTenants).toBeGreaterThanOrEqual(5);
	});

	test("/api/properties returns 3 seeded properties", async ({ page }) => {
		await login(page);
		const resp = await page.context().request.get("/api/properties");
		expect(resp.status()).toBe(200);
		const body = await resp.json();
		expect(body.code).toBe(200);
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.total).toBeGreaterThanOrEqual(3);

		const names = body.data.map((p: { name: string }) => p.name);
		expect(names).toEqual(
			expect.arrayContaining([
				"Maitama Heights",
				"Ikoyi Service Suites",
				"Lekki Phase 1 Villa",
			]),
		);
	});

	test("/api/tenants returns 5 seeded tenants", async ({ page }) => {
		await login(page);
		const resp = await page.context().request.get("/api/tenants");
		expect(resp.status()).toBe(200);
		const body = await resp.json();
		expect(body.code).toBe(200);
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.total).toBeGreaterThanOrEqual(5);

		const names = body.data.map((t: { name: string }) => t.name);
		expect(names).toEqual(
			expect.arrayContaining([
				"Ifeanyi Eze",
				"Funke Adebola",
				"Daniel Bassey",
			]),
		);
	});

	test("/api/units?status=Vacant returns seeded vacancies", async ({
		page,
	}) => {
		await login(page);
		const resp = await page
			.context()
			.request.get("/api/units?status=Vacant");
		expect(resp.status()).toBe(200);
		const body = await resp.json();
		expect(body.code).toBe(200);
		// Seed marks 4 units Vacant
		expect(body.data.length).toBeGreaterThanOrEqual(4);
		for (const u of body.data) expect(u.status).toBe("Vacant");
	});

	test("unauthenticated /dashboard redirects to /login", async ({ page }) => {
		await page.goto("/dashboard");
		await page.waitForURL(/\/login/, { timeout: 10000 });
		expect(page.url()).toContain("/login");
	});

	test("/api/auth/logout clears cookies", async ({ page }) => {
		await login(page);
		const resp = await page.context().request.delete("/api/auth/logout");
		expect(resp.status()).toBe(200);

		// Cookies should be cleared (or expired)
		const cookies = await page.context().cookies();
		const access = cookies.find((c) => c.name === "accessToken");
		expect(!access || access.value === "").toBe(true);
	});
});
