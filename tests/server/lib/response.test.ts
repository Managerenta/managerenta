import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ErrCannotRemoveOwner,
	ErrInvalidFields,
	ErrUnauthorized,
} from "@/server/constants";
import { created, fail, handleError, ok } from "@/server/lib/response";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("ok", () => {
	it("returns 200 with data and null message by default", async () => {
		const res = ok({ a: 1 });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			code: 200,
			message: null,
			data: { a: 1 },
		});
	});

	it("honors a custom message and status code in both body and HTTP status", async () => {
		const res = ok([1, 2], "partial", 206);
		expect(res.status).toBe(206);
		expect(await res.json()).toEqual({
			code: 206,
			message: "partial",
			data: [1, 2],
		});
	});
});

describe("created", () => {
	it("returns 201 with a default Created message", async () => {
		const res = created({ id: "x" });
		expect(res.status).toBe(201);
		expect(await res.json()).toEqual({
			code: 201,
			message: "Created",
			data: { id: "x" },
		});
	});
});

describe("fail", () => {
	it("mirrors the code into the HTTP status and nulls the data", async () => {
		const res = fail(404, "nope");
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({
			code: 404,
			message: "nope",
			data: null,
		});
	});
});

describe("handleError", () => {
	it("maps ErrInvalidFields to 400", async () => {
		const res = handleError(ErrInvalidFields);
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			code: 400,
			message: "Invalid fields",
			data: null,
		});
	});

	it("maps ErrUnauthorized to 401", async () => {
		const res = handleError(ErrUnauthorized);
		expect(res.status).toBe(401);
		expect((await res.json()).message).toBe("Unauthorized");
	});

	it("maps ErrCannotRemoveOwner to 403", async () => {
		const res = handleError(ErrCannotRemoveOwner);
		expect(res.status).toBe(403);
	});

	it("masks unknown error messages behind a generic 500 (via getErrorResponse default)", async () => {
		// getErrorResponse's default branch swallows the original message for
		// any error not in its identity table, in every environment.
		const res = handleError(new Error("boom: db exploded"));
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({
			code: 500,
			message: "Internal server error",
			data: null,
		});
	});

	it("masks a non-Error thrown value the same way", async () => {
		const res = handleError(undefined);
		expect(res.status).toBe(500);
		expect((await res.json()).message).toBe("Internal server error");
	});

	it("masks unknown error messages in production too", async () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.resetModules();
		const { handleError: prodHandleError } = await import(
			"@/server/lib/response"
		);
		const res = prodHandleError(new Error("secret internals leaked"));
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.message).toBe("Internal server error");
		expect(body.message).not.toContain("secret");
	});

	it("still maps known errors to their status in production", async () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.resetModules();
		// Import the error from the SAME fresh module registry so identity
		// comparison inside getErrorResponse still matches.
		const { handleError: prodHandleError } = await import(
			"@/server/lib/response"
		);
		const { ErrUnauthorized: freshErrUnauthorized } = await import(
			"@/server/constants"
		);
		const res = prodHandleError(freshErrUnauthorized);
		expect(res.status).toBe(401);
		expect((await res.json()).message).toBe("Unauthorized");
	});
});
