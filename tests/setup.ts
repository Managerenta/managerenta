// Global test environment. Runs before every test file, in every worker.
//
// SAFETY: tests must never touch the dev database (`managerenta`) or any
// remote store. Each vitest worker gets its own scratch database name so
// files can run in parallel without clobbering each other.

import { afterAll } from "vitest";

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.MONGODB_URI =
	process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
process.env.REDIS_URI = process.env.REDIS_URI ?? "redis://127.0.0.1:6379";
// Name: managerenta-vitest-<runId>-<pid>-<pool>.
//   - runId (main process pid, set by tests/globalSetup.ts and inherited here)
//     scopes every scratch DB to this exact `vitest run` so globalSetup's
//     teardown can drop them all — and so concurrent runs never collide.
//   - pid + pool keep it unique per worker within the run: pool ids are only
//     unique WITHIN one vitest process, and workers are reused across files.
const runId = process.env.VITEST_RUN_ID ?? String(process.pid);
process.env.DB_NAME = `managerenta-vitest-${runId}-${process.pid}-${process.env.VITEST_POOL_ID ?? "0"}`;

process.env.JWT_ACCESS_TOKEN_SECRET =
	"vitest-access-secret-0123456789-0123456789-abcdef";
process.env.JWT_REFRESH_TOKEN_SECRET =
	"vitest-refresh-secret-9876543210-9876543210-fedcba";

process.env.COOKIE_DOMAIN = "localhost";
process.env.NEXT_PUBLIC_ENVIRONMENT = "development";
process.env.DISABLE_RATE_LIMIT = process.env.DISABLE_RATE_LIMIT ?? "";
process.env.TRUSTED_PROXY = "0";

// Keep S3 config obviously fake — helpers that presign URLs work offline, and
// nothing in unit tests may perform a real AWS call.
process.env.S3_REGION = "us-east-1";
process.env.S3_BUCKET = "vitest-fake-bucket";
process.env.S3_ACCESS_KEY = "AKIAVITESTFAKEKEY000";
process.env.S3_SECRET_ACCESS_KEY = "vitest-fake-secret-key-not-real-000000000";

// Guarantee every worker drops its scratch database when its test files
// finish — even if an individual test file forgot to call dropTestDB() or
// crashed mid-run. Without this net, each `vitest run` orphaned its
// `managerenta-vitest-<pid>-<pool>` DB and they piled up by the hundreds.
//
// This registers a global afterAll (setup-file hooks apply to every test
// file). dropTestDB is imported dynamically INSIDE the hook on purpose: a
// top-level import would load the constants module — and capture DB_NAME —
// before the assignments above run (ES imports are hoisted), pinning the DB
// name to "". By the time this hook fires the env is set and the module is
// already cached with the correct name.
afterAll(async () => {
	const { dropTestDB } = await import("./helpers/db");
	await dropTestDB();
});
