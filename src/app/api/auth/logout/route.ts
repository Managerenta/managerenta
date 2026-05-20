import {
	ACCESS_COOKIE,
	clearAuthCookies,
	getCookieValue,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { logout } from "@/server/services";

export const runtime = "nodejs";

export const DELETE = withApiHandler(
	{ route: "/api/auth/logout" },
	withAuth(async ({ req, auth }) => {
		try {
			const headerToken = req.headers
				.get("authorization")
				?.replace("Bearer ", "");
			const token =
				(await getCookieValue(ACCESS_COOKIE)) ?? headerToken ?? null;
			if (token) {
				await logout({ userId: auth.userId, token });
			}
			await clearAuthCookies();
			return ok(null, "Logout successful");
		} catch (error) {
			return handleError(error);
		}
	}),
);
