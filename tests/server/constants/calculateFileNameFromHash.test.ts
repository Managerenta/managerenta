import { createHash } from "node:crypto";
import { existsSync, readdirSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import calculateFileNameFromHash from "@/server/constants/calculateFileNameFromHash";

// The implementation writes its scratch file into src/server/tmp (relative to
// the module) and unlinks it afterwards. Remove the directory again if the
// tests left it empty so the repo stays clean.
const implTmpDir = resolve(__dirname, "../../../src/server/tmp");

afterAll(() => {
	try {
		if (existsSync(implTmpDir) && readdirSync(implTmpDir).length === 0) {
			rmdirSync(implTmpDir);
		}
	} catch {
		// best-effort cleanup only
	}
});

describe("calculateFileNameFromHash", () => {
	it("returns the SHA-256 checksum of the buffer contents", async () => {
		const buf = Buffer.from("hello world", "utf8");
		await expect(calculateFileNameFromHash(buf)).resolves.toBe(
			"b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
		);
	});

	it("is deterministic for identical buffers", async () => {
		const a = await calculateFileNameFromHash(Buffer.from("same-content"));
		const b = await calculateFileNameFromHash(Buffer.from("same-content"));
		expect(a).toBe(b);
		expect(a).toMatch(/^[0-9a-f]{64}$/);
	});

	it("differs for different buffers and matches node:crypto", async () => {
		const one = Buffer.from([1, 2, 3]);
		const two = Buffer.from([1, 2, 4]);
		const nameOne = await calculateFileNameFromHash(one);
		const nameTwo = await calculateFileNameFromHash(two);
		expect(nameOne).not.toBe(nameTwo);
		expect(nameOne).toBe(createHash("sha256").update(one).digest("hex"));
	});

	it("handles an empty buffer (empty-input SHA-256)", async () => {
		await expect(calculateFileNameFromHash(Buffer.alloc(0))).resolves.toBe(
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		);
	});

	it("falls back to a UUID when the buffer cannot be written", async () => {
		// An array-like whose length getter throws makes `new Uint8Array(file)`
		// blow up inside the try block — the real error path, no mocks.
		const poisoned = {
			get length(): number {
				throw new Error("boom");
			},
		} as unknown as Buffer;
		const name = await calculateFileNameFromHash(poisoned);
		expect(name).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
		// A second failure yields a different id (fresh uuid per call).
		const again = await calculateFileNameFromHash(poisoned);
		expect(again).not.toBe(name);
	});

	it("cleans up its temporary scratch file", async () => {
		await calculateFileNameFromHash(Buffer.from("cleanup-check"));
		if (existsSync(implTmpDir)) {
			expect(readdirSync(implTmpDir)).toEqual([]);
		}
	});
});
