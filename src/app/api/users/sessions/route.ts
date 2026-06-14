import {
	getCookieValue,
	handleError,
	ok,
	REFRESH_COOKIE,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { getSessions, revokeAllSessions } from "@/server/services";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/users/sessions" },
	withAuth(async ({ auth }) => {
		try {
			const currentRefreshToken = await getCookieValue(REFRESH_COOKIE);
			const sessions = await getSessions({
				userId: auth.userId,
				currentRefreshToken,
			});
			return ok({ sessions });
		} catch (error) {
			return handleError(error);
		}
	}),
);

/** Revoke every session except the caller's current one. */
export const DELETE = withApiHandler(
	{ route: "/api/users/sessions" },
	withAuth(async ({ auth }) => {
		try {
			const currentRefreshToken = await getCookieValue(REFRESH_COOKIE);
			await revokeAllSessions({
				userId: auth.userId,
				exceptRefreshToken: currentRefreshToken,
			});
			return ok(null, "Signed out of all other devices");
		} catch (error) {
			return handleError(error);
		}
	}),
);
