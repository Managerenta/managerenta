import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getCalendarEvents } from "@/server/services";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/calendar" },
	withAuth(async ({ req, auth }) => {
		try {
			const url = new URL(req.url);
			const now = new Date();
			const yearRaw = Number(url.searchParams.get("year"));
			const monthRaw = Number(url.searchParams.get("month"));
			const year =
				Number.isFinite(yearRaw) && yearRaw >= 2000 && yearRaw <= 2100
					? Math.floor(yearRaw)
					: now.getFullYear();
			const month =
				Number.isFinite(monthRaw) && monthRaw >= 0 && monthRaw <= 11
					? Math.floor(monthRaw)
					: now.getMonth();

			const result = await getCalendarEvents({
				userId: auth.effectiveOwnerId,
				year,
				month,
			});
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);
