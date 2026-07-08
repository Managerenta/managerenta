import { arn, authorize } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getPlatformAnalytics } from "@/server/services/platform";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/admin/analytics" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(auth, "analytics:Read", arn.platform.analytics(), {
				req,
			});
			const url = new URL(req.url);
			const monthsRaw = Number(url.searchParams.get("months"));
			const months = Number.isFinite(monthsRaw) ? monthsRaw : 6;
			const data = await getPlatformAnalytics({ months });
			return ok(data);
		} catch (error) {
			return handleError(error);
		}
	}),
);
