import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { markAllNotificationsReadDB } from "@/server/models";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{ route: "/api/notifications/read-all" },
	withAuth(async ({ auth }) => {
		try {
			await markAllNotificationsReadDB({ userId: auth.userId });
			return ok(null, "All notifications marked as read");
		} catch (error) {
			return handleError(error);
		}
	}),
);
