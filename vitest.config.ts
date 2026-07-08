import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
			// `server-only` throws outside a React Server Component graph;
			// unit tests run under plain node, so stub it out.
			"server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
		},
	},
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
		setupFiles: ["tests/setup.ts"],
		// Runs once in the main process; its teardown drops every scratch DB
		// this run created (guaranteed net over the per-file afterAll cleanup).
		globalSetup: ["tests/globalSetup.ts"],
		hookTimeout: 30000,
		testTimeout: 30000,
		coverage: {
			provider: "v8",
			include: ["src/server/**/*.ts"],
			exclude: [
				"src/server/**/types.ts",
				"src/server/types/**",
				"src/server/**/*.d.ts",
				// Composition root + job scheduler: these wire up the running
				// app (assert secrets, connect Mongo/Redis, start cron, register
				// signal handlers). They are exercised on every server boot and
				// by the e2e suite, not by unit tests — unit-testing them would
				// mean mocking the whole runtime (coverage theater).
				"src/server/runtime/**",
				"src/server/constants/cron.ts",
			],
			reporter: ["text-summary", "text", "html"],
			reportsDirectory: "coverage",
		},
	},
});
