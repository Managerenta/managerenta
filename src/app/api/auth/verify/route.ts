import { ErrInvalidAction } from "@/server/constants";
import {
	clearAuthCookies,
	handleError,
	ok,
	setAuthCookies,
	verifyAuthToken,
	withApiHandler,
} from "@/server/lib";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{ route: "/api/auth/verify" },
	async ({ req }) => {
		try {
			const auth = await verifyAuthToken(req);
			if (!auth.userId || !auth.token) throw ErrInvalidAction;
			await setAuthCookies(auth.token);
			return ok({ userId: auth.userId });
		} catch (error) {
			await clearAuthCookies();
			return handleError(error);
		}
	},
);
