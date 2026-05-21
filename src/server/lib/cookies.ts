import "server-only";
import { cookies } from "next/headers";
import {
	ACCESS_TOKEN_MAX_AGE_SECONDS,
	COOKIE_DOMAIN,
	NODE_ENV,
	REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "../constants";
import type { IJwtPayload } from "../types";

export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";

type CookieOptions = {
	httpOnly: boolean;
	secure: boolean;
	sameSite: "lax" | "strict";
	domain?: string;
	path: string;
	expires?: Date;
	maxAge?: number;
};

export function getAuthCookieOptions(extra?: {
	expires?: Date;
	maxAge?: number;
}): CookieOptions {
	const isProd = NODE_ENV === "production";
	const opts: CookieOptions = {
		httpOnly: true,
		secure: isProd,
		// SameSite=Strict in prod (this is a same-eTLD+1 SPA, no cross-site
		// nav-bearing requests are expected). Lax in dev so localhost
		// browser flows stay easy. See SECURITY_REVIEW.md H10.
		sameSite: isProd ? "strict" : "lax",
		path: "/",
	};
	if (COOKIE_DOMAIN) opts.domain = COOKIE_DOMAIN;
	if (extra?.expires) opts.expires = extra.expires;
	if (extra?.maxAge !== undefined) opts.maxAge = extra.maxAge;
	return opts;
}

export async function setAuthCookies(token: IJwtPayload): Promise<void> {
	const store = await cookies();
	store.set(ACCESS_COOKIE, token.accessToken, {
		...getAuthCookieOptions({ expires: new Date(token.expiresIn) }),
	});
	store.set(REFRESH_COOKIE, token.refreshToken, {
		...getAuthCookieOptions({
			expires: new Date(
				token.refreshTokenExpiresIn ??
					Date.now() + REFRESH_TOKEN_MAX_AGE_SECONDS * 1000,
			),
			maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
		}),
	});
}

export async function clearAuthCookies(): Promise<void> {
	const store = await cookies();
	const opts = getAuthCookieOptions();
	store.set(ACCESS_COOKIE, "", { ...opts, maxAge: 0 });
	store.set(REFRESH_COOKIE, "", { ...opts, maxAge: 0 });
}

export async function getCookieValue(name: string): Promise<string | null> {
	const store = await cookies();
	return store.get(name)?.value ?? null;
}

// re-export for routes that need to nudge expiration manually
export { ACCESS_TOKEN_MAX_AGE_SECONDS, REFRESH_TOKEN_MAX_AGE_SECONDS };
