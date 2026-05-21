import "server-only";
import type { NextRequest } from "next/server";
import { NODE_ENV, TRUSTED_PROXY } from "../constants/environments";

/**
 * Resolve the originating client IP from request headers.
 *
 * SECURITY — see SECURITY_REVIEW.md H5 / S2.
 *
 * Forwarded-IP headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP) are
 * *client-supplied* unless an upstream edge overwrites them. There are two
 * deployment modes:
 *
 *   1. `TRUSTED_PROXY=1` — the app is behind ALB / CloudFront / Cloudflare
 *      that overwrites the forwarding headers. We prefer single-value
 *      headers (`cf-connecting-ip`, `x-real-ip`) which a properly configured
 *      edge sets, and fall back to the *last* hop of `x-forwarded-for`
 *      (closest to the edge), never the first (closest to the attacker).
 *
 *   2. `TRUSTED_PROXY=0` (default) — we still extract the *first* XFF hop
 *      so that legitimate clients land in distinct rate-limit buckets, but
 *      this value is attacker-controlled. Composite rate-limit keys (e.g.
 *      `IP + email` for login) substantially raise the cost of evasion.
 *      In production we warn once on boot so the misconfiguration is
 *      visible in logs.
 *
 * Never returns an empty string — the fallback `"unknown"` is preserved so
 * Redis keys remain valid, but it now indicates "no headers at all" rather
 * than "we refuse to extract".
 */
let warnedAboutUntrustedProxy = false;
function warnIfUntrustedProxy(): void {
	if (warnedAboutUntrustedProxy) return;
	warnedAboutUntrustedProxy = true;
	if (NODE_ENV === "production" && !TRUSTED_PROXY) {
		console.warn(
			"[clientIp] TRUSTED_PROXY is not set. Forwarded-IP headers are being honored without trust verification — rate limits and IP binding can be spoofed. Set TRUSTED_PROXY=1 once the deployment is behind an edge that overwrites x-real-ip / x-forwarded-for.",
		);
	}
}

export function getClientIp(req: NextRequest | Request): string {
	const headers = req.headers;
	const cf = headers.get("cf-connecting-ip")?.trim();
	if (cf) return cf;
	const realIp = headers.get("x-real-ip")?.trim();
	if (realIp) return realIp;

	const xff = headers.get("x-forwarded-for");
	if (xff) {
		const parts = xff
			.split(",")
			.map((p) => p.trim())
			.filter(Boolean);
		if (parts.length > 0) {
			if (TRUSTED_PROXY) {
				// Edge appends; the last hop is the most recent (closest to us)
				// and the only one we can attribute to a trusted source.
				return parts[parts.length - 1] ?? "unknown";
			}
			warnIfUntrustedProxy();
			// First hop is the most distant (client-side). Spoofable, but
			// gives us a non-degenerate bucket per attacker IP.
			return parts[0] ?? "unknown";
		}
	}

	return "unknown";
}
