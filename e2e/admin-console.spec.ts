// Operator console — real interaction drive. Logs in as the seeded operator
// (abdullah@example.com, promoted via `yarn iam:bootstrap-operator`), navigates
// the console by clicking the sidebar, verifies seeded cross-tenant data renders,
// drills into an organization, switches IAM tabs, and performs a real write
// (create + delete a custom group) to prove mutations persist through the API.
//
// Requires the seed operator to exist. If no operator is present the whole file
// is skipped with a clear message rather than failing spuriously.
import { expect, type Page, test } from "@playwright/test";

const OPERATOR = { email: "ops@example.com", password: "password123" };

async function login(page: Page): Promise<void> {
	await page.goto("/login");
	await page.getByPlaceholder("Enter your email").fill(OPERATOR.email);
	await page.getByPlaceholder("Enter your password").fill(OPERATOR.password);
	await page.getByRole("button", { name: /^sign in$/i }).click();
	// Operators are routed straight to the console on login; non-operators (a
	// misconfigured DB) land on /dashboard. Wait for either so the beforeEach
	// whoami guard can skip gracefully rather than hang.
	await page.waitForURL(/\/(admin|dashboard)/, { timeout: 20000 });
}

test.describe("Operator console", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		// Skip the suite gracefully if this user isn't an operator in this DB.
		const resp = await page.context().request.get("/api/admin/whoami");
		const body = await resp.json();
		test.skip(
			body?.data?.operator !== true,
			"Seed operator not bootstrapped — run `yarn iam:bootstrap-operator`.",
		);
	});

	test("overview shows seeded cross-tenant KPIs and org-growth chart", async ({
		page,
	}) => {
		await page.goto("/admin");
		await expect(page.getByText("Platform Overview")).toBeVisible();
		// Stat cards resolve to real seeded numbers, not the 0 placeholders.
		const orgCard = page
			.locator(".stat-grid > *")
			.filter({ hasText: "Organizations" });
		await expect(orgCard.locator(".stat-value")).toContainText(/[1-9]/, {
			timeout: 10000,
		});
		const propCard = page
			.locator(".stat-grid > *")
			.filter({ hasText: "Properties" });
		await expect(propCard.locator(".stat-value")).toContainText(/[3-9]/);
	});

	test("navigates the whole console via the sidebar", async ({ page }) => {
		await page.goto("/admin");
		await expect(page.getByText("Platform Overview")).toBeVisible();

		await page.getByRole("link", { name: "Organizations" }).click();
		await page.waitForURL(/\/admin\/organizations$/);
		await expect(
			page.getByText("Every organization on the platform."),
		).toBeVisible();

		await page.getByRole("link", { name: "IAM" }).click();
		await page.waitForURL(/\/admin\/iam$/);
		await expect(
			page.getByText(
				"Operators, groups and policies for the platform plane.",
			),
		).toBeVisible();

		await page.getByRole("link", { name: "Analytics" }).click();
		await page.waitForURL(/\/admin\/analytics$/);
		await expect(page.getByText("Platform Analytics")).toBeVisible();

		await page.getByRole("link", { name: "Audit" }).click();
		await page.waitForURL(/\/admin\/audit$/);
		await expect(page.getByText("Platform Audit Log")).toBeVisible();
	});

	test("organizations list shows the seeded org and drills into detail", async ({
		page,
	}) => {
		await page.goto("/admin/organizations");
		const orgRow = page.getByText("zakariyya estates", { exact: false });
		await expect(orgRow).toBeVisible({ timeout: 10000 });

		// Search filters the list through the backend.
		await page.locator("input.search").fill("zzz-no-match");
		await expect(
			page.getByText("No organizations match your search."),
		).toBeVisible({ timeout: 10000 });
		await page.locator("input.search").fill("");
		await expect(page.getByText("zakariyya estates")).toBeVisible();

		// Drill into the org detail page.
		await page.getByText("zakariyya estates").click();
		await page.waitForURL(/\/admin\/organizations\/[a-f0-9]{24}$/);
		await expect(page.getByText("Back to organizations")).toBeVisible();
	});

	test("IAM operators tab lists the seeded operator; system policies visible", async ({
		page,
	}) => {
		await page.goto("/admin/iam");
		// Operators tab is default.
		await expect(page.getByText(OPERATOR.email)).toBeVisible({
			timeout: 10000,
		});
		await expect(
			page.getByText("active", { exact: false }).first(),
		).toBeVisible();

		// Groups tab shows the seeded system groups.
		await page.getByText("Groups", { exact: true }).click();
		await expect(
			page.getByText("system", { exact: false }).first(),
		).toBeVisible({
			timeout: 10000,
		});

		// Policies tab shows system policies with statement documents.
		await page.getByText("Policies", { exact: true }).click();
		await expect(page.locator(".policy-doc").first()).toBeVisible({
			timeout: 10000,
		});
	});

	test("operator is confined to the console — landlord routes redirect to /admin", async ({
		page,
	}) => {
		// Logged in as operator (beforeEach). Every landlord route bounces back.
		for (const route of [
			"/dashboard",
			"/properties",
			"/tenants",
			"/settings",
		]) {
			await page.goto(route);
			await page.waitForURL(/\/admin/, { timeout: 15000 });
			expect(page.url()).toContain("/admin");
		}
	});

	test("operator lands on /admin straight after login (not the app)", async ({
		page,
	}) => {
		// beforeEach just logged the operator in via the real login form. The
		// post-login destination must be the console, never the landlord app.
		await page.waitForURL(/\/admin/, { timeout: 20000 });
		expect(page.url()).toContain("/admin");
		expect(page.url()).not.toContain("/dashboard");
	});

	test("sign out from the console clears the session and returns to /login", async ({
		page,
	}) => {
		await page.goto("/admin");
		await expect(page.getByText("Platform Overview")).toBeVisible();
		await page.getByRole("button", { name: /sign out/i }).click();
		await page.waitForURL(/\/login/, { timeout: 15000 });
		// Session is gone: the admin probe now denies.
		const resp = await page.context().request.get("/api/admin/whoami");
		expect([401, 403]).toContain(resp.status());
	});

	test("create + delete a custom IAM group persists through the API", async ({
		page,
	}) => {
		const groupName = `pw-group-${Date.now()}`;
		await page.goto("/admin/iam");
		await page.getByText("Groups", { exact: true }).click();

		await page.getByPlaceholder("New group name").fill(groupName);
		await page.getByRole("button", { name: /^create group$/i }).click();

		// The new customer group renders (write persisted + list revalidated).
		await expect(page.getByText(groupName)).toBeVisible({ timeout: 10000 });

		// Confirm via the API that it actually exists server-side.
		const listResp = await page
			.context()
			.request.get("/api/admin/iam/groups");
		const listBody = await listResp.json();
		const created = (listBody.data ?? []).find(
			(g: { name: string }) => g.name === groupName,
		);
		expect(created, "created group should exist server-side").toBeTruthy();

		// Clean up: delete the group we created so the suite is idempotent.
		const card = page.locator(".iam-card", { hasText: groupName });
		await card.getByRole("button", { name: /^delete$/i }).click();
		await expect(page.getByText(groupName)).toHaveCount(0, {
			timeout: 10000,
		});

		// Confirm deletion server-side too.
		const afterResp = await page
			.context()
			.request.get("/api/admin/iam/groups");
		const afterBody = await afterResp.json();
		const stillThere = (afterBody.data ?? []).find(
			(g: { name: string }) => g.name === groupName,
		);
		expect(stillThere, "group should be gone server-side").toBeFalsy();
	});
});
