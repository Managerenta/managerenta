import { ENVIRONMENT } from "@/server/constants";
import { renderMetrics } from "@/server/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	if (
		ENVIRONMENT !== "production" &&
		process.env.METRICS_ENABLED !== "true"
	) {
		return new Response("Metrics disabled", { status: 404 });
	}

	const { contentType, body } = await renderMetrics();
	return new Response(body, {
		status: 200,
		headers: { "Content-Type": contentType },
	});
}
