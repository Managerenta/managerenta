import { expect, test } from "@playwright/test";
import { resetOrgTestState } from "./support/reset-user";

const SEED_USER = {
	email: "abdullah@example.com",
	password: "password123",
};

const SECOND_USER = {
	email: "amina@example.com",
	password: "password123",
};

async function login(
	page: import("@playwright/test").Page,
	creds: { email: string; password: string },
): Promise<void> {
	await page.goto("/login");
	await page.getByPlaceholder("Enter your email").fill(creds.email);
	await page.getByPlaceholder("Enter your password").fill(creds.password);
	await page.getByRole("button", { name: /^sign in$/i }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe("Organizations", () => {
	// Both users persist `currentOrganizationId` across runs and any prior
	// failed run leaves the second user in an org scope, so her
	// "personal-scope" assertions return the landlord's seeded properties.
	// Force a clean baseline both before and after each test.
	test.beforeEach(async () => {
		await resetOrgTestState();
	});
	test.afterEach(async () => {
		await resetOrgTestState();
	});

	test("create org, list mine, switch, invite, accept, scoped data", async ({
		browser,
	}) => {
		// --- as landlord (abdullah) ---
		const ctxA = await browser.newContext();
		const pageA = await ctxA.newPage();
		await login(pageA, SEED_USER);

		const unique = `playwright-org-${Date.now()}`;
		const fd = new FormData();
		fd.append("name", unique);
		fd.append("description", "Created via Playwright e2e test");
		const create = await ctxA.request.post("/api/organizations", {
			multipart: {
				name: unique,
				description: "Created via Playwright e2e test",
			},
		});
		expect(create.status()).toBe(201);
		const createBody = await create.json();
		const orgId: string = createBody.data?._id ?? createBody.data?.id;
		expect(orgId).toBeTruthy();

		// list mine
		const list = await ctxA.request.get("/api/organizations");
		expect(list.status()).toBe(200);
		const listBody = await list.json();
		const names = (listBody.data?.organizations ?? []).map(
			(o: { name: string }) => o.name,
		);
		expect(names).toContain(unique);

		// switch active org
		const sw = await ctxA.request.post("/api/organizations/switch", {
			data: { organizationId: orgId },
		});
		expect(sw.status()).toBe(200);

		// invite the second user
		const invite = await ctxA.request.post(
			`/api/organizations/${orgId}/members`,
			{ data: { email: SECOND_USER.email, role: "manager" } },
		);
		expect(invite.status()).toBe(200);
		const inviteBody = await invite.json();
		const token: string = inviteBody.data.token;
		expect(token).toBeTruthy();

		// --- as the invitee (amina) ---
		const ctxB = await browser.newContext();
		const pageB = await ctxB.newPage();
		await login(pageB, SECOND_USER);

		// before accepting, amina sees her own data (no seeded properties)
		const beforeAccept = await ctxB.request.get("/api/properties");
		const beforeBody = await beforeAccept.json();
		expect(beforeBody.total).toBe(0);

		const accept = await ctxB.request.post(
			"/api/organizations/invites/accept",
			{ data: { token } },
		);
		expect(accept.status()).toBe(200);
		const acceptBody = await accept.json();
		expect(acceptBody.data.organizationId).toBe(orgId);

		// After accepting, amina's effective scope is the org owner's (landlord's)
		// data — that's the seeded 3 properties.
		const propsB = await ctxB.request.get("/api/properties");
		const propsBBody = await propsB.json();
		expect(propsBBody.total).toBeGreaterThanOrEqual(3);

		// amina (manager) can write into the shared scope
		const newProp = await ctxB.request.post("/api/properties", {
			multipart: {
				name: `pw-prop-${Date.now()}`,
				address: "1 Test Lane",
				type: "Apartment",
				totalUnits: 2,
				monthlyRent: 100000,
				description: "playwright created",
			},
		});
		expect([200, 201]).toContain(newProp.status());

		// amina swaps back to personal — sees her own (still empty) workspace
		await ctxB.request.post("/api/organizations/switch", {
			data: { organizationId: null },
		});
		const aminaPersonal = await ctxB.request.get("/api/properties");
		expect((await aminaPersonal.json()).total).toBe(0);

		// --- back as landlord ---
		// landlord swaps back to personal
		await ctxA.request.post("/api/organizations/switch", {
			data: { organizationId: null },
		});

		// landlord sees seeded 3 + the property amina just added
		const propsBack = await ctxA.request.get("/api/properties");
		const propsBackBody = await propsBack.json();
		expect(propsBackBody.total).toBeGreaterThanOrEqual(4);

		await ctxA.close();
		await ctxB.close();
	});
});
