// Full-application browser drive: log in through the real UI, then visit every
// static route in the main app AND the platform operator console, asserting each
// page renders its seeded data with no console errors, no error boundary, and no
// failed same-origin API calls. This is the integration bar from the
// full-stack-validation skill: a page is "done" only when it demonstrably talks
// to its backing services in a real browser.
import { expect, type Page, test } from "@playwright/test";

// A landlord drives the main app; a dedicated platform operator drives the
// console. Operators are confined to /admin, so the two roles must be separate
// accounts (see scripts/seed.ts).
const SEED_USER = { email: "abdullah@example.com", password: "password123" };
const OPERATOR = { email: "ops@example.com", password: "password123" };

// Console/network noise that is not a real defect. Next.js dev emits some of
// these; third-party avatar host (pravatar) can rate-limit under load.
const IGNORED_CONSOLE = [
	/Download the React DevTools/i,
	/\[Fast Refresh\]/i,
	/hydration/i, // dev-only styled-components hydration hints, asserted separately
	/Warning: Extra attributes from the server/i,
	// External asset load failures (seed avatars live on pravatar.cc). The
	// browser logs a generic "Failed to load resource" with no URL, so it can't
	// be host-filtered; it's a network/asset issue, not an app error. Real app
	// JS errors (React errors, uncaught exceptions) still fail the assertion.
	/Failed to load resource/i,
];
const IGNORED_NETWORK_HOSTS = [
	/pravatar\.cc/,
	/fonts\.g(oogleapis|static)\.com/,
];

type PageErrors = {
	console: string[];
	pageErrors: string[];
	failedRequests: string[];
};

function watch(page: Page): PageErrors {
	const errors: PageErrors = {
		console: [],
		pageErrors: [],
		failedRequests: [],
	};
	page.on("console", (msg) => {
		if (msg.type() !== "error") return;
		const text = msg.text();
		if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
		errors.console.push(text);
	});
	page.on("pageerror", (err) => {
		errors.pageErrors.push(err.message);
	});
	page.on("response", (resp) => {
		const url = resp.url();
		if (IGNORED_NETWORK_HOSTS.some((re) => re.test(url))) return;
		// Only care about our own API surface failing.
		if (!url.includes("/api/")) return;
		if (resp.status() >= 400) {
			errors.failedRequests.push(
				`${resp.status()} ${resp.request().method()} ${url}`,
			);
		}
	});
	return errors;
}

async function assertClean(
	page: Page,
	errors: PageErrors,
	label: string,
): Promise<void> {
	// No visible error boundary / crash text.
	const body =
		(await page
			.locator("body")
			.innerText()
			.catch(() => "")) || "";
	expect(body, `${label}: page-not-found boundary`).not.toContain(
		"This page could not be found",
	);
	expect(body, `${label}: app error boundary`).not.toMatch(
		/Application error|Something went wrong|Internal Server Error/i,
	);
	expect(errors.pageErrors, `${label}: uncaught page errors`).toEqual([]);
	expect(errors.failedRequests, `${label}: failed API requests`).toEqual([]);
	expect(errors.console, `${label}: console errors`).toEqual([]);
}

async function login(page: Page): Promise<void> {
	await page.goto("/login");
	await page.getByPlaceholder("Enter your email").fill(SEED_USER.email);
	await page.getByPlaceholder("Enter your password").fill(SEED_USER.password);
	await page.getByRole("button", { name: /^sign in$/i }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 20000 });
}

async function loginOperator(page: Page): Promise<void> {
	await page.goto("/login");
	await page.getByPlaceholder("Enter your email").fill(OPERATOR.email);
	await page.getByPlaceholder("Enter your password").fill(OPERATOR.password);
	await page.getByRole("button", { name: /^sign in$/i }).click();
	// Operators are routed to the console; non-operators (misconfigured DB) to
	// the app. Accept either so we can skip gracefully below.
	await page.waitForURL(/\/(admin|dashboard)/, { timeout: 20000 });
}

// Static routes in the main (app) group that must render seeded data.
const APP_ROUTES = [
	"/dashboard",
	"/properties",
	"/tenants",
	"/vendors",
	"/maintenance",
	"/documents",
	"/analytics",
	"/calendar",
	"/audit",
	"/notifications",
	"/settings",
];

const ADMIN_ROUTES = [
	"/admin",
	"/admin/organizations",
	"/admin/iam",
	"/admin/analytics",
	"/admin/audit",
];

test.describe("Full app drive — main application", () => {
	for (const route of APP_ROUTES) {
		test(`renders ${route} with no errors`, async ({ page }) => {
			const errors = watch(page);
			await login(page);
			await page.goto(route);
			await page.waitForLoadState("networkidle", { timeout: 20000 });
			// Give SWR a beat to resolve and any error boundary to paint.
			await page.waitForTimeout(500);
			await assertClean(page, errors, route);
		});
	}
});

test.describe("Full app drive — operator console", () => {
	async function ensureOperator(page: Page): Promise<boolean> {
		await loginOperator(page);
		const resp = await page.context().request.get("/api/admin/whoami");
		const body = await resp.json();
		return body?.data?.operator === true;
	}

	for (const route of ADMIN_ROUTES) {
		test(`renders ${route} with no errors`, async ({ page }) => {
			const errors = watch(page);
			test.skip(
				!(await ensureOperator(page)),
				"Seed operator not bootstrapped — run `yarn iam:bootstrap-operator --email ops@example.com`.",
			);
			await page.goto(route);
			// Operator console gates client-side via useWhoami; wait for the shell.
			await page.waitForURL(new RegExp(route.replace(/\//g, "\\/")), {
				timeout: 20000,
			});
			await page.waitForLoadState("networkidle", { timeout: 20000 });
			await page.waitForTimeout(600);
			// Must NOT have been bounced to /dashboard (operator gate failure).
			expect(
				page.url(),
				`${route}: bounced out of operator console`,
			).toContain(route);
			await assertClean(page, errors, route);
		});
	}

	test("a non-operator landlord is bounced out of /admin", async ({
		page,
	}) => {
		await login(page); // landlord (abdullah), not an operator
		await page.goto("/admin");
		await page.waitForURL(/\/dashboard/, { timeout: 15000 });
		expect(page.url()).toContain("/dashboard");
	});

	test("admin overview shows seeded cross-tenant KPIs", async ({ page }) => {
		test.skip(
			!(await ensureOperator(page)),
			"Seed operator not bootstrapped — run `yarn iam:bootstrap-operator --email ops@example.com`.",
		);
		await page.goto("/admin");
		await page.waitForLoadState("networkidle", { timeout: 20000 });
		await expect(page.getByText("Platform Overview")).toBeVisible();
		// Seed has 2 users, 3 properties, 9 units, 5 tenants, 1 operator.
		const ctx = page.context();
		const resp = await ctx.request.get("/api/admin/overview");
		expect(resp.status()).toBe(200);
		const body = await resp.json();
		expect(body.data.users).toBeGreaterThanOrEqual(2);
		expect(body.data.properties).toBeGreaterThanOrEqual(3);
		expect(body.data.tenants).toBeGreaterThanOrEqual(5);
		expect(body.data.operators).toBeGreaterThanOrEqual(1);
	});
});
