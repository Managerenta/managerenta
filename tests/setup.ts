// Global test environment. Runs before every test file, in every worker.
//
// SAFETY: tests must never touch the dev database (`managerenta`) or any
// remote store. Each vitest worker gets its own scratch database name so
// files can run in parallel without clobbering each other.

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
process.env.REDIS_URI = process.env.REDIS_URI ?? "redis://127.0.0.1:6379";
// Include the pid: pool ids are only unique WITHIN one vitest process, so two
// concurrent `vitest run` invocations (e.g. parallel CI shards or agents)
// would otherwise share scratch DBs and race each other's clearTestDB/drop.
process.env.DB_NAME = `managerenta-vitest-${process.pid}-${process.env.VITEST_POOL_ID ?? "0"}`;

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
