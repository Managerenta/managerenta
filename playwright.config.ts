import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: 0,
	workers: 1,
	reporter: "list",
	use: {
		baseURL: BASE_URL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "off",
		// `withApiHandler` enforces an Origin/Referer CSRF check on every
		// mutating /api/* call (see src/server/lib/csrf.ts). Playwright's
		// `APIRequestContext` (used by `request.*`, `ctx.request.*`, and
		// `page.request.*`) does not attach an Origin header automatically,
		// so without this, every test that hits a POST/PATCH/DELETE/PUT API
		// gets 403'd. Setting it here once means individual specs don't
		// need to re-thread it.
		extraHTTPHeaders: {
			Origin: new URL(BASE_URL).origin,
		},
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer:
		process.env.PLAYWRIGHT_WEBSERVER === "0"
			? undefined
			: {
					command: "next dev -p 3001",
					env: { DISABLE_RATE_LIMIT: "1" },
					url: `${BASE_URL}/login`,
					reuseExistingServer: true,
					timeout: 120_000,
				},
});
