import { ErrInvalidFields, ErrTryAgain } from "@/server/constants";
import { arn, authorize, resourceScope } from "@/server/iam";
import {
	created,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { createMaintenance, getMaintenanceRequests } from "@/server/services";
import {
	createMaintenanceBodySchema,
	getMaintenanceQuerySchema,
} from "@/server/validators/maintenance/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/maintenance" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(
				auth,
				"maintenance:List",
				arn.org.maintenance(resourceScope(auth)),
				{ req },
			);
			const url = new URL(req.url);
			const query = getMaintenanceQuerySchema.safeParse(
				Object.fromEntries(url.searchParams),
			);
			if (!query.success) throw ErrInvalidFields;

			const result = await getMaintenanceRequests({
				userId: auth.effectiveOwnerId,
				...query.data,
			});
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler(
	{ route: "/api/maintenance" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(
				auth,
				"maintenance:Create",
				arn.org.maintenance(resourceScope(auth)),
				{ req },
			);
			let raw: unknown;
			try {
				raw = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const body = createMaintenanceBodySchema.safeParse(raw);
			if (!body.success) throw ErrInvalidFields;

			const result = await createMaintenance({
				userId: auth.effectiveOwnerId,
				...body.data,
			});
			if (!result) throw ErrTryAgain;
			return created(result, "Maintenance request created");
		} catch (error) {
			return handleError(error);
		}
	}),
);
