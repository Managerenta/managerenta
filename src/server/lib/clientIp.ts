import "server-only";
import type { NextRequest } from "next/server";
import { TRUSTED_PROXY } from "../constants/environments";

/**
 * Resolve the originating client IP from request headers.
 *
 * SECURITY — see SECURITY_REVIEW.md H5.
 *
 * Forwarded-IP headers are *client-supplied* by default. The first hop in
 * `X-Forwarded-For` can be anything the attacker writes, and most edge
 * proxies will append (not replace), so it remains attacker-controlled even
 * behind one. We therefore only honour these headers when `TRUSTED_PROXY=1`
 * is set, signalling that the deployment fronts the app with an
 * IP-rewriting edge (ALB, CloudFront, Cloudflare).
 *
 * When trusted, we prefer single-value headers (`x-real-ip`,
 * `cf-connecting-ip`) which a properly configured edge overwrites; we read
 * the *last* hop of `x-forwarded-for` (closest to the edge) instead of the
 * first (closest to the attacker) only as a fallback.
 */
export function getClientIp(req: NextRequest | Request): string {
	if (!TRUSTED_PROXY) {
		return "unknown";
	}

	const headers = req.headers;
	const cf = headers.get("cf-connecting-ip");
	if (cf) return cf.trim();
	const realIp = headers.get("x-real-ip");
	if (realIp) return realIp.trim();
	const xff = headers.get("x-forwarded-for");
	if (xff) {
		const parts = xff.split(",");
		const last = parts[parts.length - 1]?.trim();
		if (last) return last;
	}
	return "unknown";
}
