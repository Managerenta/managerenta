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

test.describe("Properties server-side filter/sort/search", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsSeed(page);
	});

	test("search by partial name works server-side", async ({ page }) => {
		const ctx = page.context();
		const res = await ctx.request.get(
			"/api/properties?search=maitama&limit=20",
		);
		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.data.length).toBeGreaterThan(0);
		for (const p of body.data) {
			const hay = `${p.name} ${p.address}`.toLowerCase();
			expect(hay).toContain("maitama");
		}
	});

	test("filter by type returns only matching", async ({ page }) => {
		const ctx = page.context();
		const res = await ctx.request.get(
			"/api/properties?type=Apartment&limit=20",
		);
		expect(res.status()).toBe(200);
		const body = await res.json();
		for (const p of body.data) {
			expect(p.type).toBe("Apartment");
		}
	});

	test("sort=revenue sorts by monthlyRent desc", async ({ page }) => {
		const ctx = page.context();
		const res = await ctx.request.get(
			"/api/properties?sort=revenue&limit=20",
		);
		const body = await res.json();
		const rents = body.data.map(
			(p: { monthlyRent: number }) => p.monthlyRent,
		);
		const sorted = [...rents].sort((a, b) => b - a);
		expect(rents).toEqual(sorted);
	});
});
