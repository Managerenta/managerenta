import { arn, authorize } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getPlatformOverview } from "@/server/services/platform";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/admin/overview" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(auth, "analytics:Read", arn.platform.analytics(), {
				req,
			});
			const data = await getPlatformOverview();
			return ok(data);
		} catch (error) {
			return handleError(error);
		}
	}),
);
