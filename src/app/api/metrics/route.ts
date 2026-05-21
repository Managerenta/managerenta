import { timingSafeEqual } from "node:crypto";
import { METRICS_TOKEN, NODE_ENV } from "@/server/constants";
import { renderMetrics } from "@/server/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound() {
	return new Response("Not Found", { status: 404 });
}

function constantTimeCompare(a: string, b: string): boolean {
	const aBuf = Buffer.from(a);
	const bBuf = Buffer.from(b);
	if (aBuf.length !== bBuf.length) return false;
	return timingSafeEqual(aBuf, bBuf);
}

export async function GET(req: Request) {
	// Hard requirement: a non-empty token must be configured to expose the
	// endpoint, in every environment. Without it we 404 — the metrics
	// endpoint is never publicly addressable.
	if (!METRICS_TOKEN) return notFound();

	// Dev/CI convenience: when not in production, allow toggling without a
	// token via METRICS_ENABLED=true; in production the token is mandatory.
	const devToggle =
		NODE_ENV !== "production" && process.env.METRICS_ENABLED === "true";

	const header = req.headers.get("authorization") ?? "";
	const provided = header.startsWith("Bearer ")
		? header.slice("Bearer ".length).trim()
		: "";

	if (!devToggle && !constantTimeCompare(provided, METRICS_TOKEN)) {
		return notFound();
	}

	const { contentType, body } = await renderMetrics();
	return new Response(body, {
		status: 200,
		headers: { "Content-Type": contentType },
	});
}
