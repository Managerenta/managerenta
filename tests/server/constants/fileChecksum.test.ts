import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import fileChecksum from "@/server/constants/fileChecksum";

const scratch = mkdtempSync(join(tmpdir(), "managerenta-checksum-"));

afterAll(() => {
	rmSync(scratch, { recursive: true, force: true });
});

describe("fileChecksum", () => {
	it("computes the SHA-256 of a file's contents as hex", async () => {
		const file = join(scratch, "hello.txt");
		writeFileSync(file, "hello world");
		await expect(fileChecksum(file)).resolves.toBe(
			"b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
		);
	});

	it("returns the empty-input SHA-256 for an empty file", async () => {
		const file = join(scratch, "empty.bin");
		writeFileSync(file, "");
		await expect(fileChecksum(file)).resolves.toBe(
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		);
	});

	it("is deterministic across calls", async () => {
		const file = join(scratch, "repeat.txt");
		writeFileSync(file, "same bytes every time");
		const first = await fileChecksum(file);
		const second = await fileChecksum(file);
		expect(first).toBe(second);
		expect(first).toMatch(/^[0-9a-f]{64}$/);
	});

	it("changes when the file content changes", async () => {
		const file = join(scratch, "mutate.txt");
		writeFileSync(file, "version 1");
		const before = await fileChecksum(file);
		writeFileSync(file, "version 2");
		const after = await fileChecksum(file);
		expect(before).not.toBe(after);
	});

	it("returns null when the file does not exist", async () => {
		await expect(
			fileChecksum(join(scratch, "no-such-file.bin")),
		).resolves.toBeNull();
	});

	it("rejects when given a directory (stream error propagates)", async () => {
		// existsSync(dir) is true, so the read stream is opened and emits
		// EISDIR asynchronously — the promise rejects rather than returning null.
		await expect(fileChecksum(scratch)).rejects.toMatchObject({
			code: "EISDIR",
		});
	});
});
