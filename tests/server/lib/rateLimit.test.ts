import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { Redis } from "@/server/databases";
import {
	applyRateLimitHeaders,
	enforceRateLimit,
	type RateLimitResult,
} from "@/server/lib/rateLimit";

// Real local Redis. Every test uses a unique key (via keyGenerator or a
// unique client IP) so buckets never collide across tests or reruns; keys
// expire via their window TTL.

function uniqueKey(name: string): string {
	return `vitest:${name}:${randomUUID()}`;
}

function req(headers: Record<string, string> = {}): Request {
	return new Request("http://localhost:3000/api/rl-test", {
		method: "POST",
		headers,
	});
}

afterAll(async () => {
	await Redis.quit().catch(() => {});
	delete (globalThis as { __managerentaRedis?: unknown }).__managerentaRedis;
});

describe("enforceRateLimit", () => {
	it("allows requests under the limit and counts remaining down", async () => {
		const key = uniqueKey("under-limit");
		const options = {
			windowMs: 60_000,
			maxRequests: 3,
			keyGenerator: () => key,
		};

		const r1 = await enforceRateLimit(req(), options);
		const r2 = await enforceRateLimit(req(), options);
		const r3 = await enforceRateLimit(req(), options);

		expect(r1).toEqual({ allowed: true, limit: 3, remaining: 2 });
		expect(r2).toEqual({ allowed: true, limit: 3, remaining: 1 });
		expect(r3).toEqual({ allowed: true, limit: 3, remaining: 0 });
	});

	it("blocks the request that exceeds the limit and reports a sane Retry-After", async () => {
		const key = uniqueKey("over-limit");
		const options = {
			windowMs: 30_000,
			maxRequests: 1,
			keyGenerator: () => key,
		};

		const first = await enforceRateLimit(req(), options);
		const second = await enforceRateLimit(req(), options);

		expect(first.allowed).toBe(true);
		expect(second.allowed).toBe(false);
		expect(second.limit).toBe(1);
		expect(second.remaining).toBe(0);
		expect(second.retryAfterSeconds).toBeGreaterThan(0);
		expect(second.retryAfterSeconds).toBeLessThanOrEqual(30);
	});

	it("resets the bucket after the window expires", async () => {
		const key = uniqueKey("window-reset");
		const options = {
			windowMs: 1_000,
			maxRequests: 1,
			keyGenerator: () => key,
		};

		expect((await enforceRateLimit(req(), options)).allowed).toBe(true);
		expect((await enforceRateLimit(req(), options)).allowed).toBe(false);

		await new Promise((resolve) => setTimeout(resolve, 1_400));

		const afterWindow = await enforceRateLimit(req(), options);
		expect(afterWindow.allowed).toBe(true);
		expect(afterWindow.remaining).toBe(0); // fresh bucket: 1 - 1
	});

	it("doubles the quota for whitelisted origins", async () => {
		const key = uniqueKey("origin-bonus");
		const options = {
			windowMs: 60_000,
			maxRequests: 1,
			keyGenerator: () => key,
		};
		const allowedOrigin = { origin: "http://localhost:3000" };

		const r1 = await enforceRateLimit(req(allowedOrigin), options);
		const r2 = await enforceRateLimit(req(allowedOrigin), options);
		const r3 = await enforceRateLimit(req(allowedOrigin), options);

		expect(r1).toEqual({ allowed: true, limit: 2, remaining: 1 });
		expect(r2).toEqual({ allowed: true, limit: 2, remaining: 0 });
		expect(r3.allowed).toBe(false);
		expect(r3.limit).toBe(2);
	});

	it("does not double the quota for foreign origins", async () => {
		const key = uniqueKey("foreign-origin");
		const options = {
			windowMs: 60_000,
			maxRequests: 1,
			keyGenerator: () => key,
		};

		const r1 = await enforceRateLimit(
			req({ origin: "https://evil.com" }),
			options,
		);
		const r2 = await enforceRateLimit(
			req({ origin: "https://evil.com" }),
			options,
		);

		expect(r1.limit).toBe(1);
		expect(r2.allowed).toBe(false);
	});

	it("buckets by client IP when no keyGenerator is provided", async () => {
		const ipA = `ip-a-${randomUUID()}`;
		const ipB = `ip-b-${randomUUID()}`;
		const options = { windowMs: 60_000, maxRequests: 1 };

		const a1 = await enforceRateLimit(req({ "x-real-ip": ipA }), options);
		const a2 = await enforceRateLimit(req({ "x-real-ip": ipA }), options);
		const b1 = await enforceRateLimit(req({ "x-real-ip": ipB }), options);

		expect(a1.allowed).toBe(true);
		expect(a2.allowed).toBe(false); // same IP shares the bucket
		expect(b1.allowed).toBe(true); // different IP gets its own bucket
	});
});

describe("applyRateLimitHeaders", () => {
	it("sets limit and remaining headers", () => {
		const res = new Response(null);
		const result: RateLimitResult = { allowed: true, limit: 10, remaining: 4 };
		const out = applyRateLimitHeaders(res, result);
		expect(out).toBe(res);
		expect(out.headers.get("X-RateLimit-Limit")).toBe("10");
		expect(out.headers.get("X-RateLimit-Remaining")).toBe("4");
		expect(out.headers.get("Retry-After")).toBeNull();
	});

	it("adds Retry-After only when the result carries retryAfterSeconds", () => {
		const res = new Response(null);
		applyRateLimitHeaders(res, {
			allowed: false,
			limit: 10,
			remaining: 0,
			retryAfterSeconds: 17,
		});
		expect(res.headers.get("Retry-After")).toBe("17");
	});
});
