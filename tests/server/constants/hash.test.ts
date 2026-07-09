import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import hash from "@/server/constants/hash";
import hashToken from "@/server/constants/hashToken";

describe("hash (hash.js sha256)", () => {
	it("matches the well-known SHA-256 vector for the empty string", () => {
		expect(hash("")).toBe(
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		);
	});

	it("matches the well-known SHA-256 vector for 'abc'", () => {
		expect(hash("abc")).toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
	});

	it("is deterministic and returns 64 lowercase hex chars", () => {
		const a = hash("some content");
		const b = hash("some content");
		expect(a).toBe(b);
		expect(a).toMatch(/^[0-9a-f]{64}$/);
	});

	it("produces different digests for different inputs", () => {
		expect(hash("a")).not.toBe(hash("b"));
	});

	it("agrees with node:crypto sha256", () => {
		const input = "cross-check-input-123";
		const expected = createHash("sha256")
			.update(input, "utf8")
			.digest("hex");
		expect(hash(input)).toBe(expected);
	});
});

describe("hashToken (node:crypto sha256)", () => {
	it("hashes a token deterministically to 64 hex chars", () => {
		const t = "0123456789abcdef0123456789abcdef";
		const h1 = hashToken(t);
		const h2 = hashToken(t);
		expect(h1).toBe(h2);
		expect(h1).toMatch(/^[0-9a-f]{64}$/);
	});

	it("matches a known SHA-256 vector", () => {
		expect(hashToken("abc")).toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
	});

	it("is one-way distinct for near-identical tokens", () => {
		expect(hashToken("token-A")).not.toBe(hashToken("token-B"));
	});

	it("agrees with the hash.js implementation (both sha256/hex)", () => {
		const input = "same-algorithm-check";
		expect(hashToken(input)).toBe(hash(input));
	});

	it("handles utf8 multibyte input", () => {
		const expected = createHash("sha256")
			.update("héllo→世界", "utf8")
			.digest("hex");
		expect(hashToken("héllo→世界")).toBe(expected);
	});
});
