import { NextResponse } from "next/server";
import { handleError, withApiHandler, withAuth } from "@/server/lib";
import { getDashboardStats } from "@/server/services";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/dashboard/stats" },
	withAuth(async ({ auth }) => {
		try {
			const data = await getDashboardStats({
				userId: auth.effectiveOwnerId,
			});
			return NextResponse.json({ code: 200, data }, { status: 200 });
		} catch (error) {
			return handleError(error);
		}
	}),
);
