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

test.describe("Tenant portal (public token link)", () => {
	test("valid portal link shows tenant summary + payment history", async ({
		page,
		browser,
	}) => {
		await login(page);
		const tenants = await page.context().request.get("/api/tenants");
		const tenant = (await tenants.json()).data.find(
			(t: { name: string }) => t.name === "Chiamaka Obi",
		);
		expect(tenant).toBeTruthy();

		const linkResp = await page
			.context()
			.request.get(`/api/tenants/${tenant.id}/portal-link`);
		expect(linkResp.status()).toBe(200);
		const linkBody = await linkResp.json();
		const token: string = linkBody.data?.token ?? "";
		expect(token.length).toBeGreaterThan(10);

		// Open in a FRESH context — portal must not require landlord cookies.
		const anonCtx = await browser.newContext();
		const anon = await anonCtx.newPage();
		await anon.goto(`/portal/${token}`);
		await expect(anon.getByText("Tenant Portal").first()).toBeVisible({
			timeout: 15000,
		});
		await expect(anon.getByText(/Hello, Chiamaka Obi/)).toBeVisible({
			timeout: 15000,
		});
		await expect(anon.getByText("Payment History").first()).toBeVisible();
		await expect(
			anon.getByText("Outstanding Balance").first(),
		).toBeVisible();

		// Data integration bar: the seeded rent payments must actually render
		// (regression guard — a `deleted:false` filter on the field-less
		// transactions collection once silently emptied this).
		await expect(anon.getByText(/Rent for/i).first()).toBeVisible({
			timeout: 15000,
		});
		await expect(anon.getByText("No transactions yet.")).toHaveCount(0);
		// Total Paid reflects the seeded credits (₦3,600,000), not ₦0.
		await expect(anon.getByText(/₦\s?3,600,000/)).toBeVisible();

		// Submit a maintenance request from the portal
		await anon
			.getByPlaceholder("e.g. Bathroom sink is blocked")
			.fill("E2E portal request — wardrobe door");
		await anon.locator(".mr-select__control").last().click();
		await anon
			.locator(".mr-select__option", { hasText: /^Other$/ })
			.first()
			.click();
		await anon.getByRole("button", { name: "Submit Request" }).click();
		await expect(
			anon.getByText("Maintenance request submitted"),
		).toBeVisible({ timeout: 15000 });
		await anonCtx.close();

		// Landlord sees the request
		const api = await page
			.context()
			.request.get("/api/maintenance?search=wardrobe door");
		const created = (await api.json()).data.requests.find(
			(r: { title: string }) =>
				r.title === "E2E portal request — wardrobe door",
		);
		expect(created).toBeTruthy();
		expect(created.tenantId).toBe(tenant.id);

		// cleanup
		const del = await page
			.context()
			.request.delete(`/api/maintenance/${created.id}`);
		expect(del.status()).toBe(200);
	});

	test("invalid portal token shows 'Link unavailable'", async ({ page }) => {
		await page.goto("/portal/not-a-real-token");
		await expect(page.getByText("Link unavailable").first()).toBeVisible({
			timeout: 15000,
		});
	});
});

test.describe("Properties CRUD", () => {
	test("create property via UI, verify via API, then edit + delete", async ({
		page,
	}) => {
		await login(page);
		await page.goto("/properties/new");
		await expect(
			page.locator(".page-title", { hasText: "Add New Property" }),
		).toBeVisible();

		await page
			.getByPlaceholder("e.g. Sunshine Apartments")
			.fill("E2E Validation Court");
		await page
			.getByPlaceholder("e.g. 12 Park Lane, Lagos")
			.fill("1 Test Close, Gwarinpa, Abuja");
		await page.locator(".mr-select__control").first().click();
		await page
			.locator(".mr-select__option", { hasText: /^Bungalow$/ })
			.first()
			.click();
		await page.getByPlaceholder("e.g. 500000").fill("300000");
		await page.getByRole("button", { name: "Add Property" }).click();
		await expect(page.getByText("Property added successfully")).toBeVisible(
			{
				timeout: 15000,
			},
		);

		const api = await page
			.context()
			.request.get("/api/properties?search=E2E Validation Court");
		const created = (await api.json()).data.find(
			(p: { name: string }) => p.name === "E2E Validation Court",
		);
		expect(created).toBeTruthy();

		// Edit persists
		const patch = await page
			.context()
			.request.patch(`/api/properties/${created.id}`, {
				data: { monthlyRent: 350000 },
			});
		expect(patch.status()).toBe(200);
		const check = await page
			.context()
			.request.get(`/api/properties/${created.id}`);
		expect((await check.json()).data.monthlyRent).toBe(350000);

		// Detail page renders
		await page.goto(`/properties/${created.id}`);
		await expect(page.locator(".property-name")).toHaveText(
			"E2E Validation Court",
			{ timeout: 15000 },
		);

		// cleanup
		const del = await page
			.context()
			.request.delete(`/api/properties/${created.id}`);
		expect(del.status()).toBe(200);
	});
});
