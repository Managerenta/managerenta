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
