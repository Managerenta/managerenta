import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IJwtPayload } from "@/server/types";

interface SetCall {
	name: string;
	value: string;
	opts?: Record<string, unknown>;
}

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

async function importCookies(): Promise<typeof import("@/server/lib/cookies")> {
	vi.resetModules();
	return import("@/server/lib/cookies");
}

function makeToken(overrides?: Partial<IJwtPayload>): IJwtPayload {
	return {
		userId: "u1",
		ip: "1.2.3.4",
		accessToken: "access-value",
		refreshToken: "refresh-value",
		date: new Date(),
		expiresIn: new Date(Date.now() + 60_000),
		refreshTokenExpiresIn: new Date(Date.now() + 3_600_000),
		...overrides,
	};
}

beforeEach(() => {
	cookieStore.reset();
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("cookies (dev / non-production)", () => {
	// setup.ts sets NODE_ENV=test and COOKIE_DOMAIN=localhost

	it("uses bare cookie names outside production", async () => {
		const mod = await importCookies();
		expect(mod.ACCESS_COOKIE).toBe("accessToken");
		expect(mod.REFRESH_COOKIE).toBe("refreshToken");
	});

	it("getAuthCookieOptions: insecure, lax, honors COOKIE_DOMAIN in dev", async () => {
		const { getAuthCookieOptions } = await importCookies();
		expect(getAuthCookieOptions()).toEqual({
			httpOnly: true,
			secure: false,
			sameSite: "lax",
			path: "/",
			domain: "localhost",
		});
	});

	it("getAuthCookieOptions omits domain when COOKIE_DOMAIN is empty", async () => {
		vi.stubEnv("COOKIE_DOMAIN", "");
		const { getAuthCookieOptions } = await importCookies();
		expect(getAuthCookieOptions()).not.toHaveProperty("domain");
	});

	it("getAuthCookieOptions passes through expires and maxAge extras", async () => {
		const { getAuthCookieOptions } = await importCookies();
		const expires = new Date(Date.now() + 1000);
		const opts = getAuthCookieOptions({ expires, maxAge: 42 });
		expect(opts.expires).toBe(expires);
		expect(opts.maxAge).toBe(42);
	});

	it("setAuthCookies stores both tokens with their expiries", async () => {
		const mod = await importCookies();
		const token = makeToken();
		await mod.setAuthCookies(token);

		expect(cookieStore.setCalls).toHaveLength(2);
		const [access, refresh] = cookieStore.setCalls as [SetCall, SetCall];

		expect(access.name).toBe("accessToken");
		expect(access.value).toBe("access-value");
		expect(access.opts?.expires).toEqual(new Date(token.expiresIn));
		expect(access.opts?.httpOnly).toBe(true);

		expect(refresh.name).toBe("refreshToken");
		expect(refresh.value).toBe("refresh-value");
		expect(refresh.opts?.expires).toEqual(
			new Date(token.refreshTokenExpiresIn),
		);
		expect(refresh.opts?.maxAge).toBe(mod.REFRESH_TOKEN_MAX_AGE_SECONDS);
	});

	it("setAuthCookies falls back to now + 30d when refreshTokenExpiresIn is missing", async () => {
		const mod = await importCookies();
		const token = makeToken({
			refreshTokenExpiresIn: undefined as unknown as Date,
		});
		const before = Date.now();
		await mod.setAuthCookies(token);
		const refresh = cookieStore.setCalls[1] as SetCall;
		const expires = refresh.opts?.expires as Date;
		const expectedMs = mod.REFRESH_TOKEN_MAX_AGE_SECONDS * 1000;
		expect(expires.getTime()).toBeGreaterThanOrEqual(before + expectedMs);
		expect(expires.getTime()).toBeLessThanOrEqual(
			Date.now() + expectedMs + 1000,
		);
	});

	it("clearAuthCookies blanks only the two current cookie names in dev", async () => {
		const { clearAuthCookies } = await importCookies();
		await clearAuthCookies();
		expect(cookieStore.setCalls).toHaveLength(2);
		for (const call of cookieStore.setCalls) {
			expect(call.value).toBe("");
			expect(call.opts?.maxAge).toBe(0);
		}
		expect(cookieStore.setCalls.map((c) => c.name).sort()).toEqual([
			"accessToken",
			"refreshToken",
		]);
	});

	it("getCookieValue returns the stored value or null", async () => {
		const { getCookieValue } = await importCookies();
		cookieStore.jar.set("accessToken", "abc");
		expect(await getCookieValue("accessToken")).toBe("abc");
		expect(await getCookieValue("missing")).toBeNull();
	});
});

describe("cookies (production)", () => {
	beforeEach(() => {
		vi.stubEnv("NODE_ENV", "production");
	});

	it("uses __Host- prefixed cookie names", async () => {
		const mod = await importCookies();
		expect(mod.ACCESS_COOKIE).toBe("__Host-accessToken");
		expect(mod.REFRESH_COOKIE).toBe("__Host-refreshToken");
	});

	it("getAuthCookieOptions: secure, strict, and never sets a Domain (required for __Host-)", async () => {
		// COOKIE_DOMAIN=localhost is still set by tests/setup.ts — prod must ignore it.
		const { getAuthCookieOptions } = await importCookies();
		expect(getAuthCookieOptions()).toEqual({
			httpOnly: true,
			secure: true,
			sameSite: "strict",
			path: "/",
		});
	});

	it("clearAuthCookies also blanks the legacy pre-migration names in prod", async () => {
		const { clearAuthCookies } = await importCookies();
		await clearAuthCookies();
		expect(cookieStore.setCalls).toHaveLength(4);
		expect(cookieStore.setCalls.map((c) => c.name).sort()).toEqual([
			"__Host-accessToken",
			"__Host-refreshToken",
			"accessToken",
			"refreshToken",
		]);
		for (const call of cookieStore.setCalls) {
			expect(call.value).toBe("");
			expect(call.opts?.maxAge).toBe(0);
		}
	});
});
