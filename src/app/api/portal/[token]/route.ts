import { ErrInvalidFields, verifyTenantPortalToken } from "@/server/constants";
import { fail, handleError, ok, withApiHandler } from "@/server/lib";
import { getPortalSummary } from "@/server/services";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * Public tenant-portal read endpoint. Authorisation comes entirely from the
 * signed token in the URL — there is no user session here.
 */
export const GET = withApiHandler<RouteContext>(
	{ route: "/api/portal/[token]" },
	async ({ context }) => {
		try {
			const { token } = await context.params;
			if (!token) throw ErrInvalidFields;

			const payload = verifyTenantPortalToken(token);
			if (!payload) return fail(401, "Invalid or expired portal link");

			const summary = await getPortalSummary({
				tenantId: payload.tenantId,
				ownerId: payload.ownerId,
			});
			if (!summary) return fail(404, "Tenant not found");

			return ok(summary);
		} catch (error) {
			return handleError(error);
		}
	},
);
