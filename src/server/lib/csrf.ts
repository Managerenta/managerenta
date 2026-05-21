import "server-only";
import type { NextRequest } from "next/server";
import { isOriginAllowed } from "../constants";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Origin / Referer-based CSRF guard.
 *
 * SECURITY — see SECURITY_REVIEW.md H10.
 *
 * Same-Site=Strict cookies already block most CSRF vectors, but the strict
 * setting only protects browsers that implement it correctly and only on
 * navigations the browser classifies as "cross-site". This guard layers on
 * a server-side origin check so a request from an attacker page can never
 * mutate state even if the cookie somehow gets attached.
 *
 * Rules:
 *   - Safe methods (GET / HEAD / OPTIONS) are always allowed; they
 *     shouldn't mutate state by RFC, and most don't carry an Origin.
 *   - Unsafe methods must carry an `Origin` (preferred) or `Referer`
 *     header whose host matches the app's allow-list. Missing both is
 *     rejected — browsers always send one of these on cross-origin
 *     fetches, and same-origin fetches initiated by the SPA always set
 *     Origin.
 *
 * Returns `null` on pass, or an error message on reject. Callers map the
 * rejection to a 403 response.
 */
export function csrfReject(req: NextRequest | Request): string | null {
	if (!UNSAFE_METHODS.has(req.method)) return null;

	const origin = req.headers.get("origin");
	if (origin) {
		if (isOriginAllowed(origin)) return null;
		return "Origin not allowed";
	}

	// Older browsers and some XHR libraries omit Origin for same-origin
	// requests. Referer is the documented fallback.
	const referer = req.headers.get("referer");
	if (referer) {
		try {
			const refOrigin = new URL(referer).origin;
			if (isOriginAllowed(refOrigin)) return null;
			return "Referer not allowed";
		} catch {
			return "Malformed Referer";
		}
	}

	// No origin signal at all — this is either a non-browser caller or
	// someone hand-crafting a request. Refuse.
	return "Missing Origin and Referer";
}
