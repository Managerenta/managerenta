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
			// "Is the user logged in?" — a question, not an error. Return 200
			// with the answer in the body so the browser doesn't log a noisy
			// "Failed to load resource: 400" on every public page load. The
			// client (verifyUserLogin / AppContext) already reads the body
			// to decide; the status was never the contract.
			try {
				const auth = await verifyAuthToken(req);
				if (!auth.userId || !auth.token) {
					return ok({ authenticated: false });
				}
				await setAuthCookies(auth.token);
				return ok({ authenticated: true, userId: auth.userId });
			} catch {
				// Missing / invalid / expired tokens — treat as "not logged
				// in" rather than an error. Clear any stale cookies so the
				// browser stops sending them.
				await clearAuthCookies();
				return ok({ authenticated: false });
			}
		} catch (error) {
			return handleError(error);
		}
	},
);
