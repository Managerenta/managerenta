import "server-only";
import type { NextRequest } from "next/server";

export function getClientIp(req: NextRequest | Request): string {
	const headers = req.headers;
	const xff = headers.get("x-forwarded-for");
	if (xff) {
		const first = xff.split(",")[0]?.trim();
		if (first) return first;
	}
	const realIp = headers.get("x-real-ip");
	if (realIp) return realIp.trim();
	const cf = headers.get("cf-connecting-ip");
	if (cf) return cf.trim();
	return "unknown";
}
