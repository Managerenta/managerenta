import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { Redis } from "@/server/databases";
import {
	consumeChallenge,
	getExpectedOrigins,
	getRpId,
	storeChallenge,
	WEBAUTHN_RP_NAME,
} from "@/server/lib/webauthn";

function req(headers: Record<string, string> = {}): Request {
	return new Request("http://localhost:3000/api/webauthn", { headers });
}

afterEach(() => {
	vi.unstubAllEnvs();
});

afterAll(async () => {
	await Redis.quit().catch(() => {});
	delete (globalThis as { __managerentaRedis?: unknown }).__managerentaRedis;
});

describe("getRpId", () => {
	it("uses COOKIE_DOMAIN as-is when it has no leading dot", () => {
		// tests/setup.ts sets COOKIE_DOMAIN=localhost
		expect(getRpId()).toBe("localhost");
	});

	it("strips the cookie-convention leading dot", async () => {
		vi.stubEnv("COOKIE_DOMAIN", ".managerenta.com");
		vi.resetModules();
		const mod = await import("@/server/lib/webauthn");
		expect(mod.getRpId()).toBe("managerenta.com");
	});

	it("falls back to localhost when COOKIE_DOMAIN is empty", async () => {
		vi.stubEnv("COOKIE_DOMAIN", "");
		vi.resetModules();
		const mod = await import("@/server/lib/webauthn");
		expect(mod.getRpId()).toBe("localhost");
	});
});

describe("getExpectedOrigins (RP ID = localhost)", () => {
	it("echoes back an origin whose host equals the RP ID", () => {
		expect(
			getExpectedOrigins(req({ origin: "http://localhost:3000" })),
		).toEqual(["http://localhost:3000"]);
	});

	it("rejects a foreign origin and falls back to the RP default", () => {
		expect(getExpectedOrigins(req({ origin: "https://evil.com" }))).toEqual(
			["http://localhost"],
		);
	});

	it("falls back on a malformed origin header", () => {
		expect(getExpectedOrigins(req({ origin: "not a url" }))).toEqual([
			"http://localhost",
		]);
	});

	it("falls back to http://localhost when no Origin is sent", () => {
		expect(getExpectedOrigins(req())).toEqual(["http://localhost"]);
	});
});

describe("getExpectedOrigins (RP ID = managerenta.com)", () => {
	async function importWithDomain(): Promise<
		typeof import("@/server/lib/webauthn")
	> {
		vi.stubEnv("COOKIE_DOMAIN", ".managerenta.com");
		vi.resetModules();
		return import("@/server/lib/webauthn");
	}

	it("accepts the apex and any subdomain of the RP ID", async () => {
		const mod = await importWithDomain();
		expect(
			mod.getExpectedOrigins(req({ origin: "https://managerenta.com" })),
		).toEqual(["https://managerenta.com"]);
		expect(
			mod.getExpectedOrigins(
				req({ origin: "https://app.managerenta.com" }),
			),
		).toEqual(["https://app.managerenta.com"]);
	});

	it("rejects a suffix-lookalike host and uses the https fallback", async () => {
		const mod = await importWithDomain();
		expect(
			mod.getExpectedOrigins(
				req({ origin: "https://evilmanagerenta.com" }),
			),
		).toEqual(["https://managerenta.com"]);
	});

	it("uses an https fallback for non-localhost RP IDs", async () => {
		const mod = await importWithDomain();
		expect(mod.getExpectedOrigins(req())).toEqual([
			"https://managerenta.com",
		]);
	});
});

describe("challenge store (real Redis)", () => {
	it("round-trips a stored challenge and consumes it exactly once", async () => {
		const ns = `vitest-${randomUUID()}`;
		const value = { challenge: "c-123", context: { userId: "u1" } };

		await storeChallenge(ns, "id-1", value);
		const first = await consumeChallenge(ns, "id-1");
		const second = await consumeChallenge(ns, "id-1");

		expect(first).toEqual(value); // single use...
		expect(second).toBeNull(); // ...deleted on consume
	});

	it("returns null for a challenge that was never stored", async () => {
		expect(
			await consumeChallenge(`vitest-${randomUUID()}`, "nope"),
		).toBeNull();
	});

	it("returns null (and still deletes) when the stored payload is corrupt", async () => {
		const ns = `vitest-${randomUUID()}`;
		// Write garbage under the exact key format the store uses.
		await Redis.setex(`webauthn:challenge:${ns}:bad`, 60, "not-json{");
		expect(await consumeChallenge(ns, "bad")).toBeNull();
		expect(await Redis.get(`webauthn:challenge:${ns}:bad`)).toBeNull();
	});

	it("stores challenges with a TTL so abandoned ceremonies expire", async () => {
		const ns = `vitest-${randomUUID()}`;
		await storeChallenge(ns, "ttl-check", { challenge: "x" });
		const ttl = await Redis.ttl(`webauthn:challenge:${ns}:ttl-check`);
		expect(ttl).toBeGreaterThan(0);
		expect(ttl).toBeLessThanOrEqual(5 * 60);
		await Redis.del(`webauthn:challenge:${ns}:ttl-check`);
	});
});

describe("constants", () => {
	it("exposes the RP display name", () => {
		expect(WEBAUTHN_RP_NAME).toBe("manageRenta");
	});
});
