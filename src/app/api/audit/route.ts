import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { arn, authorize, resourceScope } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { IOrganizationRole } from "@/server/models/organizations/types";
import { listAuditEvents } from "@/server/services";
import { getAuditQuerySchema } from "@/server/validators/audit/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/audit" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(
				auth,
				"audit:List",
				arn.org.audit(resourceScope(auth)),
				{ req },
			);
			// Audit history is sensitive: in an organization only admins may read
			// it. In personal scope the owner is always allowed.
			if (auth.organizationId && auth.role !== IOrganizationRole.ADMIN) {
				throw ErrInvalidAction;
			}

			const url = new URL(req.url);
			const query = getAuditQuerySchema.safeParse(
				Object.fromEntries(url.searchParams),
			);
			if (!query.success) throw ErrInvalidFields;

			const result = await listAuditEvents({
				ownerId: auth.effectiveOwnerId,
				...query.data,
			});
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);
