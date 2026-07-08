import { ErrInvalidFields, ErrResourceNotFound } from "@/server/constants";
import { arn, authorize, resourceScope } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import {
	deleteMaintenance,
	getMaintenanceById,
	updateMaintenance,
} from "@/server/services";
import {
	maintenanceParamsSchema,
	updateMaintenanceBodySchema,
} from "@/server/validators/maintenance/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/maintenance/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"maintenance:Read",
				arn.org.maintenance(resourceScope(auth), id),
				{ req },
			);
			const params = maintenanceParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const result = await getMaintenanceById({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
			});
			if (!result) throw ErrResourceNotFound;
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/maintenance/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"maintenance:Update",
				arn.org.maintenance(resourceScope(auth), id),
				{ req },
			);
			const params = maintenanceParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			let raw: unknown;
			try {
				raw = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const body = updateMaintenanceBodySchema.safeParse(raw);
			if (!body.success) throw ErrInvalidFields;

			const result = await updateMaintenance({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
				payload: body.data,
			});
			if (!result) throw ErrResourceNotFound;
			return ok(result, "Maintenance request updated");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/maintenance/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"maintenance:Delete",
				arn.org.maintenance(resourceScope(auth), id),
				{ req },
			);
			const params = maintenanceParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const deleted = await deleteMaintenance({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
			});
			if (!deleted) throw ErrResourceNotFound;
			return ok(null, "Maintenance request deleted");
		} catch (error) {
			return handleError(error);
		}
	}),
);
