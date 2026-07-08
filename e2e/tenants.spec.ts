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

test.describe("Tenants routes", () => {
	test("/tenants renders seeded tenants with payment badges", async ({
		page,
	}) => {
		await login(page);
		await page.goto("/tenants");
		await expect(page.getByText("My Tenants").first()).toBeVisible();
		await expect(page.getByText("Ifeanyi Eze")).toBeVisible({
			timeout: 15000,
		});
		await expect(page.getByText("Funke Adebola")).toBeVisible();
		await expect(page.getByText("Daniel Bassey")).toBeVisible();
		// Payment badge derived from seeded dueDate/paymentStatus
		expect(await page.locator(".payment-badge").count()).toBeGreaterThan(0);
	});

	test("/tenants search filters server-side", async ({ page }) => {
		await login(page);
		await page.goto("/tenants");
		await expect(page.getByText("Ifeanyi Eze")).toBeVisible({
			timeout: 15000,
		});
		await page.getByPlaceholder("Search tenants...").fill("Chiamaka");
		await expect(page.getByText("Chiamaka Obi")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText("Ifeanyi Eze")).toHaveCount(0);
	});

	test("/tenants/[id] detail shows contact info and transactions", async ({
		page,
	}) => {
		await login(page);
		const resp = await page.context().request.get("/api/tenants");
		const body = await resp.json();
		const tenant = body.data.find(
			(t: { name: string }) => t.name === "Ifeanyi Eze",
		);
		expect(tenant).toBeTruthy();

		await page.goto(`/tenants/${tenant.id}`);
		await expect(page.locator(".tenant-name").first()).toHaveText(
			"Ifeanyi Eze",
			{ timeout: 15000 },
		);
		await expect(page.getByText("Contact Information").first()).toBeVisible();
		await expect(page.getByText("ifeanyi@example.com").first()).toBeVisible();

		// Transactions from seed (3 rent + 1 utilities)
		const tx = await page
			.context()
			.request.get(`/api/tenants/${tenant.id}/transactions`);
		expect(tx.status()).toBe(200);
		const txBody = await tx.json();
		expect(txBody.data.transactions.length).toBeGreaterThanOrEqual(4);
	});

	test("edit tenant persists to DB and shows in UI", async ({ page }) => {
		await login(page);
		const resp = await page.context().request.get("/api/tenants");
		const tenant = (await resp.json()).data.find(
			(t: { name: string }) => t.name === "Hauwa Ibrahim",
		);
		expect(tenant).toBeTruthy();

		await page.goto(`/tenants/${tenant.id}/edit`);
		await expect(page.locator(".page-title", { hasText: "Edit Tenant" })).toBeVisible({
			timeout: 15000,
		});
		const phoneInput = page.getByPlaceholder("+2348012345678");
		await expect(phoneInput).toHaveValue(/\+234/, { timeout: 10000 });
		await phoneInput.fill("+2348099999999");
		await page.getByRole("button", { name: "Save Changes" }).click();
		await expect(page.getByText("Tenant updated successfully")).toBeVisible({
			timeout: 15000,
		});

		// Re-read from API: write persisted
		const check = await page
			.context()
			.request.get(`/api/tenants/${tenant.id}`);
		const updated = (await check.json()).data;
		expect(updated.phone).toBe("+2348099999999");

		// restore
		const restore = await page
			.context()
			.request.patch(`/api/tenants/${tenant.id}`, {
				data: { phone: "+2348037811122" },
			});
		expect(restore.status()).toBe(200);
	});

	test("add transaction via UI persists and appears in history", async ({
		page,
	}) => {
		await login(page);
		const resp = await page.context().request.get("/api/tenants");
		const tenant = (await resp.json()).data.find(
			(t: { name: string }) => t.name === "Daniel Bassey",
		);
		const before = await page
			.context()
			.request.get(`/api/tenants/${tenant.id}/transactions`);
		const beforeCount = (await before.json()).data.transactions.length;

		await page.goto(`/tenants/${tenant.id}/add-transaction`);
		await expect(
			page.locator(".page-title", { hasText: "Add Transaction" }),
		).toBeVisible({ timeout: 15000 });
		// Pick "Other" type so amount is manual
		await page.locator(".type-card", { hasText: "Other" }).click();
		await page.getByPlaceholder("0").fill("15000");
		await page
			.getByPlaceholder("Add notes about this transaction...")
			.fill("E2E validation test charge");
		await page.getByRole("button", { name: "Save Transaction" }).click();
		await expect(
			page.getByText("Transaction recorded successfully"),
		).toBeVisible({ timeout: 15000 });

		const after = await page
			.context()
			.request.get(`/api/tenants/${tenant.id}/transactions`);
		const afterBody = await after.json();
		expect(afterBody.data.transactions.length).toBe(beforeCount + 1);
		const created = afterBody.data.transactions.find(
			(t: { description: string }) =>
				t.description === "E2E validation test charge",
		);
		expect(created).toBeTruthy();

		// cleanup: delete the created transaction
		const del = await page
			.context()
			.request.delete(
				`/api/tenants/${tenant.id}/transactions/${created.id}`,
			);
		expect(del.status()).toBe(200);
	});

	test("unauthenticated /tenants redirects to /login", async ({ page }) => {
		await page.goto("/tenants");
		await page.waitForURL(/\/login/, { timeout: 10000 });
	});
});
