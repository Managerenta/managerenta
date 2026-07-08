import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import createTempDir from "@/server/constants/createTempDir";

const base = mkdtempSync(join(tmpdir(), "managerenta-tempdir-"));

afterAll(() => {
	rmSync(base, { recursive: true, force: true });
});

describe("createTempDir", () => {
	it("creates <base>/tmp and returns its absolute path", () => {
		const dir = createTempDir(base);
		expect(dir).toBe(resolve(base, "./tmp"));
		expect(existsSync(dir)).toBe(true);
	});

	it("is idempotent: returns the existing directory on subsequent calls", () => {
		const first = createTempDir(base);
		const second = createTempDir(base);
		expect(second).toBe(first);
		expect(existsSync(second)).toBe(true);
	});

	it("creates nested parents when the base itself is deep", () => {
		const deepBase = join(base, "a", "b");
		// mkdirSync(recursive) inside createTempDir must create a/b/tmp.
		const dir = createTempDir(deepBase);
		expect(dir).toBe(resolve(deepBase, "./tmp"));
		expect(existsSync(dir)).toBe(true);
	});
});
