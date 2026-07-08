import {
	ErrInvalidFields,
	ErrTenantNotFound,
	signTenantPortalToken,
} from "@/server/constants";
import { arn, authorize, resourceScope } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getTenantById } from "@/server/services";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Issues (or re-issues) a shareable self-service portal link for a tenant. The
 * token encodes only { tenantId, ownerId } and authorises the public /portal
 * endpoints for that single tenant.
 */
export const GET = withApiHandler<RouteContext>(
	{ route: "/api/tenants/[id]/portal-link" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"tenants:GeneratePortalLink",
				arn.org.tenants(resourceScope(auth), id),
				{ req },
			);
			if (!id) throw ErrInvalidFields;

			const tenant = await getTenantById({
				id,
				userId: auth.effectiveOwnerId,
			});
			if (!tenant) throw ErrTenantNotFound;

			const token = signTenantPortalToken({
				tenantId: id,
				ownerId: auth.effectiveOwnerId,
			});

			return ok({ token, path: `/portal/${token}` });
		} catch (error) {
			return handleError(error);
		}
	}),
);
