import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { markNotificationReadDB } from "@/server/models";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withApiHandler<RouteContext>(
	{ route: "/api/notifications/[id]/read" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			if (!id) throw ErrInvalidFields;
			const ok_ = await markNotificationReadDB({
				userId: auth.userId,
				id,
			});
			if (!ok_) throw ErrInvalidAction;
			return ok(null, "Notification marked as read");
		} catch (error) {
			return handleError(error);
		}
	}),
);
