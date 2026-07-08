import { ErrInvalidFields, ErrUnitNotFound } from "@/server/constants";
import { arn, authorize, resourceScope } from "@/server/iam";
import {
	getClientIp,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import {
	deleteUnit,
	getUnit,
	recordAuditEvent,
	updateUnit,
} from "@/server/services";
import {
	unitParamsSchema,
	updateUnitBodySchema,
} from "@/server/validators/units/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/units/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"units:Read",
				arn.org.units(resourceScope(auth), id),
				{ req },
			);
			const params = unitParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const result = await getUnit({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
			});
			if (!result) throw ErrUnitNotFound;
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/units/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"units:Update",
				arn.org.units(resourceScope(auth), id),
				{ req },
			);
			const params = unitParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			let raw: unknown;
			try {
				raw = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const body = updateUnitBodySchema.safeParse(raw);
			if (!body.success) throw ErrInvalidFields;

			const result = await updateUnit({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
				payload: body.data,
			});
			if (!result) throw ErrUnitNotFound;
			return ok(result, "Unit updated");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/units/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"units:Delete",
				arn.org.units(resourceScope(auth), id),
				{ req },
			);
			const params = unitParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const result = await deleteUnit({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
			});
			if (!result) throw ErrUnitNotFound;
			void recordAuditEvent({
				ownerId: auth.effectiveOwnerId,
				actorId: auth.userId,
				organizationId: auth.organizationId ?? undefined,
				action: "delete",
				entityType: "unit",
				entityId: params.data.id,
				ip: getClientIp(req),
			});
			return ok(null, "Unit deleted");
		} catch (error) {
			return handleError(error);
		}
	}),
);
