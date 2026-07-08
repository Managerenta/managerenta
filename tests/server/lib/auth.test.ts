import { sign } from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = vi.hoisted(() => {
	const jar = new Map<string, string>();
	const setCalls: Array<{
		name: string;
		value: string;
		opts?: Record<string, unknown>;
	}> = [];
	return {
		jar,
		setCalls,
		reset(): void {
			jar.clear();
			setCalls.length = 0;
		},
		api: {
			get(name: string): { name: string; value: string } | undefined {
				const value = jar.get(name);
				return value === undefined ? undefined : { name, value };
			},
			set(
				name: string,
				value: string,
				opts?: Record<string, unknown>,
			): void {
				setCalls.push({ name, value, opts });
				jar.set(name, value);
			},
		},
	};
});

vi.mock("next/headers", () => ({
	cookies: async () => cookieStore.api,
}));
vi.mock("@/server/services", () => ({
	reLoginUserWithRefreshToken: vi.fn(),
}));
vi.mock("@/server/services/users/getUserById", () => ({
	default: vi.fn(),
}));
vi.mock("@/server/models", () => ({
	getOrganizationByIdDB: vi.fn(),
}));

import { ErrInvalidAction, ErrUnauthorized } from "@/server/constants";
import {
	type AuthResult,
	assertWriteRole,
	verifyAuthToken,
	withAuth,
} from "@/server/lib/auth";
import { getOrganizationByIdDB } from "@/server/models";
import { IOrganizationRole } from "@/server/models/organizations/types";
import { reLoginUserWithRefreshToken } from "@/server/services";
import getUserById from "@/server/services/users/getUserById";

const mockGetUserById = vi.mocked(getUserById);
const mockGetOrg = vi.mocked(getOrganizationByIdDB);
const mockReLogin = vi.mocked(reLoginUserWithRefreshToken);

const ACCESS_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_TOKEN_SECRET as string;

function tokenData(
	userId: string,
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		userId,
		ip: "9.9.9.9",
		date: new Date(),
		accessToken: "",
		refreshToken: "",
		expiresIn: new Date(Date.now() + 60_000),
		refreshTokenExpiresIn: new Date(Date.now() + 86_400_000),
		...overrides,
	};
}

function signAccess(
	userId: string,
	overrides: Record<string, unknown> = {},
): string {
	return sign({ data: tokenData(userId, overrides) }, ACCESS_SECRET, {
		algorithm: "HS256",
	});
}

function signRefresh(
	userId: string,
	overrides: Record<string, unknown> = {},
): string {
	return sign({ data: tokenData(userId, overrides) }, REFRESH_SECRET, {
		algorithm: "HS256",
	});
}

function req(headers: Record<string, string> = {}): Request {
	return new Request("http://localhost:3000/api/protected", {
		method: "GET",
		headers,
	});
}

beforeEach(() => {
	cookieStore.reset();
	vi.clearAllMocks();
	// Default: user exists, personal scope (no org switched on).
	mockGetUserById.mockResolvedValue({ id: "u1" } as never);
});

describe("verifyAuthToken — access token sources", () => {
	it("authenticates from the access-token cookie", async () => {
		cookieStore.jar.set("accessToken", signAccess("u1"));
		const result = await verifyAuthToken(req());
		expect(result.userId).toBe("u1");
		expect(result.refreshed).toBe(false);
		expect(result.effectiveOwnerId).toBe("u1");
		expect(result.organizationId).toBeNull();
		expect(result.role).toBeNull();
	});

	it("falls back to the Authorization Bearer header when no cookie is set", async () => {
		const result = await verifyAuthToken(
			req({ authorization: `Bearer ${signAccess("u2")}` }),
		);
		expect(result.userId).toBe("u2");
		expect(result.refreshed).toBe(false);
	});

	it("rejects with ErrUnauthorized when no credentials exist at all", async () => {
		await expect(verifyAuthToken(req())).rejects.toBe(ErrUnauthorized);
	});

	it("rejects with ErrUnauthorized for an expired access token with no refresh cookie", async () => {
		cookieStore.jar.set(
			"accessToken",
			signAccess("u1", { expiresIn: new Date(Date.now() - 1_000) }),
		);
		await expect(verifyAuthToken(req())).rejects.toBe(ErrUnauthorized);
	});

	it("rejects a token signed with the wrong secret", async () => {
		const forged = sign(
			{ data: tokenData("u1") },
			"attacker-controlled-secret",
			{ algorithm: "HS256" },
		);
		cookieStore.jar.set("accessToken", forged);
		await expect(verifyAuthToken(req())).rejects.toBe(ErrUnauthorized);
	});
});

describe("verifyAuthToken — refresh flow", () => {
	it("refreshes the session from a valid refresh token", async () => {
		const refreshJwt = signRefresh("u3");
		cookieStore.jar.set("accessToken", "garbage-expired-token");
		cookieStore.jar.set("refreshToken", refreshJwt);
		const nextToken = tokenData("u3", {
			accessToken: "new-access",
			refreshToken: "new-refresh",
		});
		mockReLogin.mockResolvedValue(nextToken as never);

		const result = await verifyAuthToken(req());

		expect(result.refreshed).toBe(true);
		expect(result.userId).toBe("u3");
		expect(result.token).toBe(nextToken);
		expect(mockReLogin).toHaveBeenCalledWith({
			id: "u3",
			refreshToken: refreshJwt,
			ip: "9.9.9.9", // the IP bound inside the refresh token wins
		});
	});

	it("falls back to the request client IP when the refresh token has none", async () => {
		cookieStore.jar.set("refreshToken", signRefresh("u3", { ip: "" }));
		mockReLogin.mockResolvedValue(tokenData("u3") as never);

		await verifyAuthToken(req({ "x-real-ip": "7.7.7.7" }));

		expect(mockReLogin).toHaveBeenCalledWith(
			expect.objectContaining({ ip: "7.7.7.7" }),
		);
	});

	it("rejects with ErrUnauthorized when re-login is refused", async () => {
		cookieStore.jar.set("refreshToken", signRefresh("u3"));
		mockReLogin.mockResolvedValue(null as never);
		await expect(verifyAuthToken(req())).rejects.toBe(ErrUnauthorized);
	});

	it("rejects a garbage refresh token with ErrUnauthorized (401)", async () => {
		// A malformed refresh JWT is an auth failure (401), consistent with a
		// missing cookie — the decode throw is swallowed to null in the source.
		cookieStore.jar.set("refreshToken", "not-a-jwt");
		await expect(verifyAuthToken(req())).rejects.toBe(ErrUnauthorized);
		expect(mockReLogin).not.toHaveBeenCalled();
	});
});

describe("verifyAuthToken — organization scope resolution", () => {
	beforeEach(() => {
		cookieStore.jar.set("accessToken", signAccess("u1"));
	});

	it("grants implicit admin when the caller owns the current organization", async () => {
		mockGetUserById.mockResolvedValue({
			currentOrganizationId: "org1",
		} as never);
		mockGetOrg.mockResolvedValue({ ownerId: "u1", members: [] } as never);

		const result = await verifyAuthToken(req());

		expect(mockGetOrg).toHaveBeenCalledWith({ id: "org1" });
		expect(result.organizationId).toBe("org1");
		expect(result.role).toBe(IOrganizationRole.ADMIN);
		expect(result.effectiveOwnerId).toBe("u1");
	});

	it("scopes members to the org owner with their membership role", async () => {
		mockGetUserById.mockResolvedValue({
			currentOrganizationId: "org1",
		} as never);
		mockGetOrg.mockResolvedValue({
			ownerId: "boss",
			members: [{ memberId: "u1", permission: IOrganizationRole.VIEWER }],
		} as never);

		const result = await verifyAuthToken(req());

		expect(result.effectiveOwnerId).toBe("boss");
		expect(result.organizationId).toBe("org1");
		expect(result.role).toBe(IOrganizationRole.VIEWER);
	});

	it("falls back to personal scope when the user is no longer a member (stale org id)", async () => {
		mockGetUserById.mockResolvedValue({
			currentOrganizationId: "org1",
		} as never);
		mockGetOrg.mockResolvedValue({
			ownerId: "boss",
			members: [{ memberId: "someone-else", permission: "admin" }],
		} as never);

		const result = await verifyAuthToken(req());

		expect(result.effectiveOwnerId).toBe("u1");
		expect(result.organizationId).toBeNull();
		expect(result.role).toBeNull();
	});

	it("falls back to personal scope when the organization no longer exists", async () => {
		mockGetUserById.mockResolvedValue({
			currentOrganizationId: "org-gone",
		} as never);
		mockGetOrg.mockResolvedValue(null as never);

		const result = await verifyAuthToken(req());
		expect(result).toMatchObject({
			effectiveOwnerId: "u1",
			organizationId: null,
			role: null,
		});
	});

	it("falls back to personal scope when the user lookup throws", async () => {
		mockGetUserById.mockRejectedValue(new Error("db down"));
		const result = await verifyAuthToken(req());
		expect(result).toMatchObject({
			userId: "u1",
			effectiveOwnerId: "u1",
			organizationId: null,
			role: null,
		});
	});
});

describe("assertWriteRole", () => {
	function auth(
		organizationId: string | null,
		role: IOrganizationRole | null,
	): AuthResult {
		return {
			userId: "u1",
			token: tokenData("u1") as never,
			refreshed: false,
			effectiveOwnerId: "owner",
			organizationId,
			role,
		};
	}

	it("allows personal scope (no organization)", () => {
		expect(() => assertWriteRole(auth(null, null))).not.toThrow();
	});

	it("allows org admins", () => {
		expect(() =>
			assertWriteRole(auth("org1", IOrganizationRole.ADMIN)),
		).not.toThrow();
	});

	it("allows org managers", () => {
		expect(() =>
			assertWriteRole(auth("org1", IOrganizationRole.MANAGER)),
		).not.toThrow();
	});

	it("rejects viewers with ErrInvalidAction", () => {
		expect(() =>
			assertWriteRole(auth("org1", IOrganizationRole.VIEWER)),
		).toThrow(ErrInvalidAction);
	});

	it("rejects an org scope with no resolvable role", () => {
		expect(() => assertWriteRole(auth("org1", null))).toThrow(
			ErrInvalidAction,
		);
	});
});

describe("withAuth", () => {
	it("passes auth and context into the handler on success", async () => {
		cookieStore.jar.set("accessToken", signAccess("u1"));
		const handler = vi.fn(async ({ auth }: { auth: AuthResult }) =>
			Response.json({ user: auth.userId }),
		);
		const wrapped = withAuth<{ id: string }>(handler as never);

		const res = await wrapped({
			req: req() as never,
			context: { id: "42" },
		});

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ user: "u1" });
		expect(handler).toHaveBeenCalledTimes(1);
		const args = handler.mock.calls[0]?.[0] as {
			auth: AuthResult;
			context: { id: string };
		};
		expect(args.auth.userId).toBe("u1");
		expect(args.context).toEqual({ id: "42" });
		// No refresh, no failure: nothing was written to the cookie jar.
		expect(cookieStore.setCalls).toHaveLength(0);
	});

	it("returns 401 and clears cookies when auth fails, without calling the handler", async () => {
		const handler = vi.fn();
		const wrapped = withAuth(handler as never);

		const res = await wrapped({ req: req() as never, context: undefined });

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({
			code: 401,
			message: "Unauthorized",
			data: null,
		});
		expect(handler).not.toHaveBeenCalled();
		const cleared = cookieStore.setCalls.filter(
			(c) => c.value === "" && c.opts?.maxAge === 0,
		);
		expect(cleared.map((c) => c.name).sort()).toEqual([
			"accessToken",
			"refreshToken",
		]);
	});

	it("sets refreshed auth cookies after the handler runs", async () => {
		cookieStore.jar.set("refreshToken", signRefresh("u3"));
		mockReLogin.mockResolvedValue(
			tokenData("u3", {
				accessToken: "rotated-access",
				refreshToken: "rotated-refresh",
			}) as never,
		);
		const handler = vi.fn(async () => Response.json({ ok: true }));
		const wrapped = withAuth(handler as never);

		const res = await wrapped({ req: req() as never, context: undefined });

		expect(res.status).toBe(200);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(cookieStore.jar.get("accessToken")).toBe("rotated-access");
		expect(cookieStore.jar.get("refreshToken")).toBe("rotated-refresh");
	});
});
