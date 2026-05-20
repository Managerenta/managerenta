import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const CREDS = {
	email: "test-managerenta.zp62v@passmail.net",
	password: "Pacifist1-Fruit0-Unseen1-Frivolous2-Cupbearer9-Tremble3-Dole9",
	username: "Nullish",
};

const results = [];
function record(name, ok, info = "") {
	results.push({ name, ok, info });
	const tag = ok ? "PASS" : "FAIL";
	console.log(`[${tag}] ${name}${info ? ` — ${info}` : ""}`);
}

async function run() {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ ignoreHTTPSErrors: true });
	context.on("weberror", (e) =>
		console.log("PAGE ERROR:", e.error().message),
	);
	const page = await context.newPage();
	page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
	page.on("console", (msg) => {
		if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text());
	});

	try {
		// ---------- Test 1: /login renders ONLY the Login component ----------
		await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
		await page
			.waitForLoadState("networkidle", { timeout: 15000 })
			.catch(() => {});

		const loginHeading = await page
			.getByText("Welcome Back", { exact: false })
			.count();
		const signupHeading = await page
			.getByText("Create Your Account", { exact: false })
			.count();
		const emailField = await page.locator('input[type="email"]').count();
		const firstNameField = await page
			.getByPlaceholder("Enter your first name")
			.count();
		const url1 = page.url();

		record(
			"GET /login shows Welcome Back heading",
			loginHeading >= 1,
			`heading count=${loginHeading}`,
		);
		record(
			"GET /login does NOT show Signup heading",
			signupHeading === 0,
			`signup-heading count=${signupHeading}`,
		);
		record(
			"GET /login does NOT show 'first name' field (no page mixing)",
			firstNameField === 0,
			`first-name count=${firstNameField}`,
		);
		record(
			"GET /login has exactly 1 email field",
			emailField === 1,
			`email-field count=${emailField}`,
		);
		record("GET /login stays on /login URL", url1.endsWith("/login"), url1);

		// ---------- Test 2: Bad credentials show error toast and stay on /login ----------
		await page.fill('input[type="email"]', "wrong@example.com");
		await page.fill('input[type="password"]', "wrong-pass");
		await page.getByRole("button", { name: /sign in/i }).click();
		await page.waitForTimeout(2500);
		const toastVisible = await page
			.locator(
				".Toastify__toast--error, [class*='toast'], [role='alert']",
			)
			.first()
			.isVisible()
			.catch(() => false);
		const stayedOnLogin = page.url().endsWith("/login");
		record("Bad credentials stay on /login", stayedOnLogin, page.url());
		record(
			"Bad credentials surface an error toast",
			toastVisible,
			toastVisible ? "toast visible" : "no toast detected",
		);

		// Clear fields for the real attempt
		await page.fill('input[type="email"]', "");
		await page.fill('input[type="password"]', "");

		// ---------- Test 3: Valid credentials log in and redirect to /dashboard ----------
		await page.fill('input[type="email"]', CREDS.email);
		await page.fill('input[type="password"]', CREDS.password);

		const loginResPromise = page
			.waitForResponse(
				(r) =>
					r.url().includes("/api/login") &&
					r.request().method() === "POST",
				{ timeout: 20000 },
			)
			.catch(() => null);

		await page.getByRole("button", { name: /sign in/i }).click();

		const loginRes = await loginResPromise;
		const loginStatus = loginRes ? loginRes.status() : null;
		record(
			"POST /api/login returned 201",
			loginStatus === 201,
			`status=${loginStatus}`,
		);

		await page
			.waitForURL("**/dashboard**", { timeout: 20000 })
			.catch(() => {});
		const finalUrl = page.url();
		const onDashboard = /\/dashboard(\/|\?|$)/.test(finalUrl);
		record(
			"After successful login, redirected to /dashboard",
			onDashboard,
			finalUrl,
		);

		// Confirm cookies set
		const cookies = await context.cookies();
		const hasAccess = cookies.some((c) => c.name === "accessToken");
		const hasRefresh = cookies.some((c) => c.name === "refreshToken");
		record(
			"accessToken cookie set after login",
			hasAccess,
			`accessToken=${hasAccess}`,
		);
		record(
			"refreshToken cookie set after login",
			hasRefresh,
			`refreshToken=${hasRefresh}`,
		);

		// ---------- Test 4: /signup renders ONLY the Signup component ----------
		// Use a fresh context so we are not authenticated
		await context.clearCookies();
		await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
		await page
			.waitForLoadState("networkidle", { timeout: 15000 })
			.catch(() => {});

		const signupHeading2 = await page
			.getByText("Create Your Account", { exact: false })
			.count();
		const loginHeading2 = await page
			.getByText("Welcome Back", { exact: false })
			.count();
		const firstNameField2 = await page
			.getByPlaceholder("Enter your first name")
			.count();
		const url4 = page.url();

		record(
			"GET /signup shows Signup heading",
			signupHeading2 >= 1,
			`signup-heading count=${signupHeading2}`,
		);
		record(
			"GET /signup does NOT show Login heading",
			loginHeading2 === 0,
			`login-heading count=${loginHeading2}`,
		);
		record(
			"GET /signup shows 'first name' field",
			firstNameField2 === 1,
			`first-name count=${firstNameField2}`,
		);
		record(
			"GET /signup stays on /signup URL",
			url4.endsWith("/signup"),
			url4,
		);

		// ---------- Test 5: Fresh signup creates an account (201) ----------
		// Use a unique email/username per run so we exercise the success path.
		const stamp = Date.now().toString().slice(-8);
		const freshUser = `pw_${stamp}`;
		const freshEmail = `pw-${stamp}@passmail.test`;

		await page.fill('input[placeholder="Enter your first name"]', "Play");
		await page.fill('input[placeholder="Enter your last name"]', "Wright");
		await page.fill('input[placeholder="Enter your email"]', freshEmail);
		await page.fill('input[placeholder="Enter your username"]', freshUser);
		await page.fill(
			'input[placeholder="Create a strong password"]',
			CREDS.password,
		);
		await page.fill(
			'input[placeholder="Re-enter your password"]',
			CREDS.password,
		);

		const signupResPromise = page
			.waitForResponse(
				(r) =>
					r.url().includes("/api/auth/signup") &&
					r.request().method() === "POST",
				{ timeout: 20000 },
			)
			.catch(() => null);

		await page.getByRole("button", { name: /create account/i }).click();
		const signupRes = await signupResPromise;
		const signupStatus = signupRes ? signupRes.status() : null;

		record(
			"POST /api/auth/signup reached the backend",
			signupStatus !== null,
			`status=${signupStatus}`,
		);
		record(
			"Fresh signup returns 201 Created",
			signupStatus === 201,
			`status=${signupStatus} email=${freshEmail}`,
		);

		// After a successful signup the form should toast + push to /login
		await page.waitForURL("**/login**", { timeout: 10000 }).catch(() => {});
		record(
			"After successful signup, redirected to /login",
			/\/login(\/|\?|$)/.test(page.url()),
			page.url(),
		);
	} finally {
		await browser.close();
	}

	const failed = results.filter((r) => !r.ok);
	console.log(
		`\n=== ${results.length - failed.length}/${results.length} checks passed ===`,
	);
	if (failed.length) {
		console.log("\nFailed:");
		for (const f of failed) console.log(` - ${f.name}: ${f.info}`);
		process.exit(1);
	}
}

run().catch((err) => {
	console.error("FATAL:", err);
	process.exit(2);
});
