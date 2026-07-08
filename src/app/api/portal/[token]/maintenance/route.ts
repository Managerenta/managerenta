import { ErrInvalidFields, verifyTenantPortalToken } from "@/server/constants";
import { created, fail, handleError, withApiHandler } from "@/server/lib";
import { submitPortalMaintenance } from "@/server/services";
import { portalMaintenanceBodySchema } from "@/server/validators/portal/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * Public endpoint: a tenant files a maintenance request from their portal. The
 * request is scoped to the tenant's own property/unit on the server side.
 */
export const POST = withApiHandler<RouteContext>(
	{
		route: "/api/portal/[token]/maintenance",
		// Public token-holders create landlord-visible records; keep the
		// bucket much tighter than the global 100/min default.
		rateLimit: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
	},
	async ({ req, context }) => {
		try {
			const { token } = await context.params;
			if (!token) throw ErrInvalidFields;

			const payload = verifyTenantPortalToken(token);
			if (!payload) return fail(401, "Invalid or expired portal link");

			let raw: unknown;
			try {
				raw = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const body = portalMaintenanceBodySchema.safeParse(raw);
			if (!body.success) throw ErrInvalidFields;

			const result = await submitPortalMaintenance({
				tenantId: payload.tenantId,
				ownerId: payload.ownerId,
				...body.data,
			});
			if (!result) return fail(404, "Tenant not found");

			return created({ submitted: true }, "Request submitted");
		} catch (error) {
			return handleError(error);
		}
	},
);
