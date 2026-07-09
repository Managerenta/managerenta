import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Keep the real Redis client (rate limiting is exercised against local
// Redis) but stub out the MongoDB connection — handler only awaits it.
vi.mock("@/server/databases", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/server/databases")>();
	return {
		...actual,
		connectMongoDB: vi.fn().mockResolvedValue(undefined),
	};
});

import { ErrUnauthorized } from "@/server/constants";
import { connectMongoDB, Redis } from "@/server/databases";
import { withApiHandler } from "@/server/lib/handler";

const mockConnectMongo = vi.mocked(connectMongoDB);

function makeReq(
	method: string,
	headers: Record<string, string> = {},
): NextRequest {
	return new NextRequest(
		new Request("http://localhost:3000/api/test", { method, headers }),
	);
}

/** Unique per-test client identity so rate-limit buckets never collide. */
function uniqueIp(): string {
	return `test-ip-${randomUUID()}`;
}

beforeEach(() => {
	vi.clearAllMocks();
});

afterAll(async () => {
	await Redis.quit().catch(() => {});
	delete (globalThis as { __managerentaRedis?: unknown }).__managerentaRedis;
});

describe("withApiHandler — CSRF gate", () => {
	it("rejects an unsafe request with no origin signal before touching mongo or the handler", async () => {
		const handler = vi.fn();
		const wrapped = withApiHandler({ route: "/api/csrf-a" }, handler);

		const res = await wrapped(makeReq("POST"), undefined);

		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({
			code: 403,
			message: "Missing Origin and Referer",
			data: null,
		});
		expect(handler).not.toHaveBeenCalled();
		expect(mockConnectMongo).not.toHaveBeenCalled();
		// A failed CSRF check must not consume a rate-limit token, so no
		// rate-limit headers appear either.
		expect(res.headers.get("X-RateLimit-Limit")).toBeNull();
	});

	it("rejects a foreign origin with 403", async () => {
		const wrapped = withApiHandler({ route: "/api/csrf-b" }, vi.fn());
		const res = await wrapped(
			makeReq("POST", { origin: "https://evil.com" }),
			undefined,
		);
		expect(res.status).toBe(403);
		expect((await res.json()).message).toBe("Origin not allowed");
	});

	it("skips the origin check when csrf is explicitly disabled", async () => {
		const handler = vi.fn(async () => Response.json({ ok: true }));
		const wrapped = withApiHandler(
			{ route: "/api/csrf-off", csrf: false, rateLimit: false },
			handler,
		);
		const res = await wrapped(makeReq("POST"), undefined);
		expect(res.status).toBe(200);
		expect(handler).toHaveBeenCalledTimes(1);
	});
});

describe("withApiHandler — rate limiting", () => {
	it("passes under the limit, applies rate-limit headers, and connects mongo", async () => {
		const handler = vi.fn(async () => Response.json({ ok: true }));
		const wrapped = withApiHandler(
			{
				route: "/api/rl-ok",
				rateLimit: { windowMs: 60_000, maxRequests: 5 },
			},
			handler,
		);

		const res = await wrapped(
			makeReq("GET", { "x-real-ip": uniqueIp() }),
			undefined,
		);

		expect(res.status).toBe(200);
		expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
		expect(res.headers.get("X-RateLimit-Remaining")).toBe("4");
		expect(mockConnectMongo).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("returns 429 with Retry-After once the limit is exhausted", async () => {
		const handler = vi.fn(async () => Response.json({ ok: true }));
		const wrapped = withApiHandler(
			{
				route: "/api/rl-block",
				rateLimit: { windowMs: 60_000, maxRequests: 1 },
			},
			handler,
		);
		const ip = uniqueIp();

		const first = await wrapped(
			makeReq("GET", { "x-real-ip": ip }),
			undefined,
		);
		const second = await wrapped(
			makeReq("GET", { "x-real-ip": ip }),
			undefined,
		);

		expect(first.status).toBe(200);
		expect(second.status).toBe(429);
		expect(await second.json()).toEqual({
			code: 429,
			message: "Too many requests, please try again later.",
			data: null,
		});
		expect(second.headers.get("Retry-After")).toBeTruthy();
		expect(second.headers.get("X-RateLimit-Remaining")).toBe("0");
		expect(handler).toHaveBeenCalledTimes(1); // only the first got through
	});

	it("applies no rate-limit headers when rate limiting is disabled for the route", async () => {
		const wrapped = withApiHandler(
			{ route: "/api/rl-off", rateLimit: false },
			async () => Response.json({ ok: true }),
		);
		const res = await wrapped(makeReq("GET"), undefined);
		expect(res.status).toBe(200);
		expect(res.headers.get("X-RateLimit-Limit")).toBeNull();
		expect(res.headers.get("X-RateLimit-Remaining")).toBeNull();
	});
});

describe("withApiHandler — handler execution and errors", () => {
	it("forwards req and context to the handler", async () => {
		const handler = vi.fn(async ({ context }: { context: unknown }) =>
			Response.json(context),
		);
		const wrapped = withApiHandler<{ params: { id: string } }>(
			{ route: "/api/ctx", rateLimit: false },
			handler,
		);

		const res = await wrapped(makeReq("GET"), { params: { id: "77" } });

		expect(await res.json()).toEqual({ params: { id: "77" } });
		const args = handler.mock.calls[0]?.[0] as {
			req: NextRequest;
			context: unknown;
		};
		expect(args.req.method).toBe("GET");
	});

	it("maps known thrown errors through handleError and keeps rate-limit headers", async () => {
		const wrapped = withApiHandler(
			{
				route: "/api/throws",
				rateLimit: { windowMs: 60_000, maxRequests: 5 },
			},
			async () => {
				throw ErrUnauthorized;
			},
		);

		const res = await wrapped(
			makeReq("GET", { "x-real-ip": uniqueIp() }),
			undefined,
		);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({
			code: 401,
			message: "Unauthorized",
			data: null,
		});
		expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
	});

	it("turns an unknown thrown error into a 500 without crashing", async () => {
		const wrapped = withApiHandler(
			{ route: "/api/throws-unknown", rateLimit: false },
			async () => {
				throw new Error("kaboom");
			},
		);
		const res = await wrapped(makeReq("GET"), undefined);
		expect(res.status).toBe(500);
		// getErrorResponse's default branch masks unknown messages.
		expect((await res.json()).message).toBe("Internal server error");
	});

	it("returns 500 when the mongo connection itself fails", async () => {
		mockConnectMongo.mockRejectedValueOnce(new Error("mongo unreachable"));
		const handler = vi.fn();
		const wrapped = withApiHandler(
			{ route: "/api/mongo-down", rateLimit: false },
			handler,
		);
		const res = await wrapped(makeReq("GET"), undefined);
		expect(res.status).toBe(500);
		expect(handler).not.toHaveBeenCalled();
	});
});
