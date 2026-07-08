import { getIamOperatorByUserIdDB } from "@/server/iam/models";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";

export const runtime = "nodejs";

/**
 * Probe endpoint for the frontend: is the current user a platform operator, and
 * are they active? Never 403s (unlike the guarded admin routes) so the client
 * can decide whether to reveal the /admin entry without tripping an error.
 */
export const GET = withApiHandler(
	{ route: "/api/admin/whoami" },
	withAuth(async ({ auth }) => {
		try {
			const operator = await getIamOperatorByUserIdDB({
				userId: auth.userId,
			});
			return ok({
				operator: Boolean(operator) && operator?.status === "active",
				status: operator?.status ?? null,
			});
		} catch (error) {
			return handleError(error);
		}
	}),
);
