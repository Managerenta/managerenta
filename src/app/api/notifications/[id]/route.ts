import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { deleteNotificationDB } from "@/server/models";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/notifications/[id]" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			if (!id) throw ErrInvalidFields;
			const removed = await deleteNotificationDB({
				userId: auth.userId,
				id,
			});
			if (!removed) throw ErrInvalidAction;
			return ok(null, "Notification removed");
		} catch (error) {
			return handleError(error);
		}
	}),
);
