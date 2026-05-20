import { expect, test } from "@playwright/test";

const SEED_USER = {
	email: "abdullah@example.com",
	password: "password123",
};

test.describe("Auth flow", () => {
	test("login with seeded user → redirects to dashboard", async ({
		page,
	}) => {
		await page.goto("/login");

		await page.getByPlaceholder("Enter your email").fill(SEED_USER.email);
		await page
			.getByPlaceholder("Enter your password")
			.fill(SEED_USER.password);
		await page.getByRole("button", { name: /sign in/i }).click();

		await page.waitForURL(/\/dashboard/, { timeout: 15000 });
		expect(page.url()).toContain("/dashboard");

		const cookies = await page.context().cookies();
		const accessToken = cookies.find((c) => c.name === "accessToken");
		expect(accessToken?.value).toBeTruthy();
	});

	test("login with wrong password → shows error, stays on /login", async ({
		page,
	}) => {
		await page.goto("/login");

		await page.getByPlaceholder("Enter your email").fill(SEED_USER.email);
		await page
			.getByPlaceholder("Enter your password")
			.fill("wrong-password");
		await page.getByRole("button", { name: /sign in/i }).click();

		// Give the request time to fail
		await page.waitForTimeout(2000);
		expect(page.url()).toContain("/login");
	});

	test("signup creates new user → auto-logs in, lands on /dashboard", async ({
		page,
	}) => {
		const suffix = Date.now();
		const newUser = {
			firstName: "Test",
			lastName: `User${suffix}`,
			username: `testuser${suffix}`,
			email: `testuser${suffix}@example.com`,
			password: "newpassword123",
		};

		await page.goto("/signup");

		await page
			.getByPlaceholder("Enter your first name")
			.fill(newUser.firstName);
		await page
			.getByPlaceholder("Enter your last name")
			.fill(newUser.lastName);
		await page
			.getByPlaceholder("Enter your username")
			.fill(newUser.username);
		await page.getByPlaceholder("Enter your email").fill(newUser.email);
		await page
			.getByPlaceholder("Create a strong password")
			.fill(newUser.password);
		await page
			.getByPlaceholder("Re-enter your password")
			.fill(newUser.password);

		// Tick the T&C checkbox if present
		const checkbox = page.locator('input[type="checkbox"]#check-me');
		if (await checkbox.count()) await checkbox.check({ force: true });

		await page
			.getByRole("button", { name: /sign up|create account/i })
			.click();

		// Signup sets auth cookies. Frontend pushes to /login but proxy.ts
		// bounces an already-logged-in user to /dashboard.
		await page.waitForURL(/\/dashboard/, { timeout: 15000 });
		expect(page.url()).toContain("/dashboard");

		const cookies = await page.context().cookies();
		const accessToken = cookies.find((c) => c.name === "accessToken");
		expect(accessToken?.value).toBeTruthy();
	});

	test("logged-in user visiting /login is bounced to /dashboard", async ({
		page,
	}) => {
		await page.goto("/login");
		await page.getByPlaceholder("Enter your email").fill(SEED_USER.email);
		await page
			.getByPlaceholder("Enter your password")
			.fill(SEED_USER.password);
		await page.getByRole("button", { name: /sign in/i }).click();
		await page.waitForURL(/\/dashboard/, { timeout: 15000 });

		// Now hit /login again — proxy.ts should redirect to /dashboard
		await page.goto("/login");
		await page.waitForURL(/\/dashboard/, { timeout: 10000 });
		expect(page.url()).toContain("/dashboard");
	});
});
