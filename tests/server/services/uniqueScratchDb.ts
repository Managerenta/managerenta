// Must be the FIRST import of every service test file in this directory.
//
// tests/setup.ts assigns a per-worker scratch DB (keyed by VITEST_POOL_ID),
// but pool ids are reused across test FILES, so two files running in
// parallel (or back-to-back) can share one database — and each file's
// beforeAll(clearTestDB) / afterAll(dropTestDB) would then wipe a sibling
// file's data mid-run. Suffixing the name here (before src/server/constants
// is imported and freezes DB_NAME) gives every test file its own database,
// which its own afterAll drop then cleans up.
import { randomBytes } from "node:crypto";

process.env.DB_NAME = `${process.env.DB_NAME ?? "managerenta-vitest"}-svc-${randomBytes(4).toString("hex")}`;
