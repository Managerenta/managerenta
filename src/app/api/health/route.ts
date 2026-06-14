import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { Redis } from "@/server/databases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for load balancers (ALB/ECS) and uptime monitors.
 * Intentionally unauthenticated and not rate limited. Reports the status of
 * the MongoDB and Redis connections. Returns 200 only when both are reachable.
 */
export async function GET(): Promise<Response> {
	const checks: { mongo: boolean; redis: boolean } = {
		mongo: false,
		redis: false,
	};

	try {
		// readyState 1 === connected
		if (mongoose.connection.readyState === 1) {
			await mongoose.connection.db?.admin().ping();
			checks.mongo = true;
		}
	} catch {
		checks.mongo = false;
	}

	try {
		const pong = await Redis.ping();
		checks.redis = pong === "PONG";
	} catch {
		checks.redis = false;
	}

	const healthy = checks.mongo && checks.redis;
	return NextResponse.json(
		{
			status: healthy ? "ok" : "degraded",
			uptime: process.uptime(),
			checks,
		},
		{ status: healthy ? 200 : 503 },
	);
}
