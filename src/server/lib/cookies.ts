import "server-only";
import { cookies } from "next/headers";
import {
	ACCESS_TOKEN_MAX_AGE_SECONDS,
	COOKIE_DOMAIN,
	NODE_ENV,
	REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "../constants";
import type { IJwtPayload } from "../types";

// SECURITY — see SECURITY_REVIEW.md M3.
//
// In production we use `__Host-` prefixed cookies. The browser enforces:
//   - the `Secure` attribute is present (HTTPS only),
//   - no `Domain` attribute (host-only — not shared with siblings),
//   - `Path=/`.
// Together those make the cookie unreadable from any sibling subdomain
// (which closes the "subdomain takeover steals tokens" class) and unsettable
// over plain HTTP. In dev we have neither HTTPS nor a real domain, so the
// browser would refuse to store a `__Host-` cookie; fall back to the bare
// name there.
const IS_PROD = NODE_ENV === "production";

export const ACCESS_COOKIE = IS_PROD ? "__Host-accessToken" : "accessToken";
export const REFRESH_COOKIE = IS_PROD ? "__Host-refreshToken" : "refreshToken";

// Legacy names from before the __Host- migration. We clear these alongside
// the current names on logout / auth failure so users who still hold a
// pre-migration cookie don't keep a stale orphan around forever.
const LEGACY_ACCESS_COOKIE = "accessToken";
const LEGACY_REFRESH_COOKIE = "refreshToken";

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
	const opts: CookieOptions = {
		httpOnly: true,
		secure: IS_PROD,
		// SameSite=Strict in prod (this is a same-eTLD+1 SPA, no cross-site
		// nav-bearing requests are expected). Lax in dev so localhost
		// browser flows stay easy. See SECURITY_REVIEW.md H10.
		sameSite: IS_PROD ? "strict" : "lax",
		path: "/",
	};
	// __Host- cookies REQUIRE no Domain attribute. In dev (no __Host- prefix)
	// we still honor COOKIE_DOMAIN if it's been set for a custom local setup.
	if (!IS_PROD && COOKIE_DOMAIN) opts.domain = COOKIE_DOMAIN;
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
	// Best-effort legacy cleanup: when the cookie names rotated (__Host-
	// migration) old browsers still carry the pre-migration cookie. Clear
	// it explicitly so a stale orphan can't out-live the migration.
	if (IS_PROD) {
		store.set(LEGACY_ACCESS_COOKIE, "", { ...opts, maxAge: 0 });
		store.set(LEGACY_REFRESH_COOKIE, "", { ...opts, maxAge: 0 });
	}
}

export async function getCookieValue(name: string): Promise<string | null> {
	const store = await cookies();
	return store.get(name)?.value ?? null;
}

// re-export for routes that need to nudge expiration manually
export { ACCESS_TOKEN_MAX_AGE_SECONDS, REFRESH_TOKEN_MAX_AGE_SECONDS };
