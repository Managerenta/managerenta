import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { unreadSummary } from "@/server/services";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/notifications/unread" },
	withAuth(async ({ auth }) => {
		try {
			const result = await unreadSummary({ userId: auth.userId });
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);
