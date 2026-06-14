import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getAnalytics } from "@/server/services";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/analytics" },
	withAuth(async ({ req, auth }) => {
		try {
			const url = new URL(req.url);
			const monthsRaw = Number(url.searchParams.get("months"));
			const months =
				Number.isFinite(monthsRaw) && monthsRaw >= 3 && monthsRaw <= 12
					? Math.floor(monthsRaw)
					: 6;

			const result = await getAnalytics({
				userId: auth.effectiveOwnerId,
				months,
			});
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);
