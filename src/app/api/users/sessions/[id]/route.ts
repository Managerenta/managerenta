import { ErrInvalidFields, ErrResourceNotFound } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { revokeSession } from "@/server/services";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/users/sessions/[id]" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			if (!id || typeof id !== "string") throw ErrInvalidFields;

			const revoked = await revokeSession({
				userId: auth.userId,
				sessionId: id,
			});
			if (!revoked) throw ErrResourceNotFound;
			return ok(null, "Session revoked");
		} catch (error) {
			return handleError(error);
		}
	}),
);
