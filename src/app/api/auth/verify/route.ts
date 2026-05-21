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
	{
		route: "/api/auth/verify",
		// This endpoint re-issues cookies on every successful call (effectively
		// extending the refresh-token window). Cap the rate so anyone holding
		// a valid token cannot loop on it to extend session lifetime forever
		// or to amplify load. See SECURITY_REVIEW.md S+M.
		rateLimit: { windowMs: 60_000, maxRequests: 30 },
	},
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
