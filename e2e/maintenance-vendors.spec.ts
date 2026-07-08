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

/** Open a react-select dropdown by container class and click an option. */
async function pickOption(
	page: import("@playwright/test").Page,
	controlLocator: import("@playwright/test").Locator,
	optionText: string | RegExp,
): Promise<void> {
	await controlLocator.click();
	await page
		.locator(".mr-select__option", { hasText: optionText })
		.first()
		.click();
}

test.describe("Maintenance", () => {
	test("list renders seeded requests with stats", async ({ page }) => {
		await login(page);
		await page.goto("/maintenance");
		await expect(
			page.locator(".title", { hasText: "Maintenance" }).first(),
		).toBeVisible();
		await expect(page.getByText("Kitchen sink leaking").first()).toBeVisible({
			timeout: 15000,
		});
		await expect(
			page.getByText("Tripping breaker in living room").first(),
		).toBeVisible();
		// Stat cards populated from seeded statuses
		await expect(page.getByText("In Progress").first()).toBeVisible();
	});

	test("search filters requests server-side", async ({ page }) => {
		await login(page);
		await page.goto("/maintenance");
		await expect(page.getByText("Kitchen sink leaking").first()).toBeVisible({
			timeout: 15000,
		});
		await page.getByPlaceholder("Search requests…").fill("Generator");
		await expect(
			page.getByText("Generator servicing overdue").first(),
		).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Kitchen sink leaking")).toHaveCount(0);
	});

	test("create request via modal persists to DB", async ({ page }) => {
		await login(page);
		await page.goto("/maintenance");
		await page.getByRole("button", { name: "New Request" }).click();
		await expect(page.getByText("New Maintenance Request")).toBeVisible();

		await page
			.getByPlaceholder("e.g. Leaking kitchen tap")
			.fill("E2E test — broken window latch");
		const selects = page.locator(".modal .mr-select__control");
		await pickOption(page, selects.nth(0), "Maitama Heights"); // Property
		await pickOption(page, selects.nth(1), /^Structural$/); // Category
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.getByText("Request created")).toBeVisible({
			timeout: 15000,
		});

		const api = await page
			.context()
			.request.get("/api/maintenance?search=broken window latch");
		const body = await api.json();
		const created = body.data.requests.find(
			(r: { title: string }) =>
				r.title === "E2E test — broken window latch",
		);
		expect(created).toBeTruthy();
		expect(created.status).toBe("open");

		// cleanup
		const del = await page
			.context()
			.request.delete(`/api/maintenance/${created.id}`);
		expect(del.status()).toBe(200);
	});
});

test.describe("Vendors", () => {
	test("list renders seeded vendors", async ({ page }) => {
		await login(page);
		await page.goto("/vendors");
		await expect(
			page.locator(".title", { hasText: "Vendors" }).first(),
		).toBeVisible();
		await expect(page.getByText("Musa Danladi").first()).toBeVisible({
			timeout: 15000,
		});
		await expect(page.getByText("CoolBreeze HVAC").first()).toBeVisible();
	});

	test("create + delete vendor via modal persists", async ({ page }) => {
		await login(page);
		await page.goto("/vendors");
		await page.getByRole("button", { name: "Add Vendor" }).first().click();
		await expect(
			page.locator(".modal-title", { hasText: "Add Vendor" }),
		).toBeVisible();

		await page
			.getByPlaceholder("Contact / business name")
			.fill("E2E Test Vendor Ltd");
		const selects = page.locator(".modal .mr-select__control");
		await pickOption(page, selects.first(), /^General$/);
		await page
			.locator(".modal")
			.getByRole("button", { name: "Add Vendor" })
			.click();
		await expect(page.getByText("Vendor added")).toBeVisible({
			timeout: 15000,
		});
		await expect(page.getByText("E2E Test Vendor Ltd").first()).toBeVisible();

		// verify persisted then cleanup via API
		const api = await page
			.context()
			.request.get("/api/vendors?search=E2E Test Vendor");
		const created = (await api.json()).data.vendors.find(
			(v: { name: string }) => v.name === "E2E Test Vendor Ltd",
		);
		expect(created).toBeTruthy();
		const del = await page
			.context()
			.request.delete(`/api/vendors/${created.id}`);
		expect(del.status()).toBe(200);
	});

	test("unauthenticated /vendors shows no vendor data", async ({ page }) => {
		await page.goto("/vendors");
		// Page is not edge-gated; must not leak data and should bounce to login
		// once the API 401s.
		await page.waitForURL(/\/login/, { timeout: 15000 });
		await expect(page.getByText("Musa Danladi")).toHaveCount(0);
	});
});
