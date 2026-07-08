import { NextResponse } from "next/server";
import { arn, authorize, resourceScope } from "@/server/iam";
import { handleError, withApiHandler, withAuth } from "@/server/lib";
import { getDashboardStats } from "@/server/services";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/dashboard/stats" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(
				auth,
				"analytics:Read",
				arn.org.analytics(resourceScope(auth)),
				{ req },
			);
			const data = await getDashboardStats({
				userId: auth.effectiveOwnerId,
			});
			return NextResponse.json({ code: 200, data }, { status: 200 });
		} catch (error) {
			return handleError(error);
		}
	}),
);
