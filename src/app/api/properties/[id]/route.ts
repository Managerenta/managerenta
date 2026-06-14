import type { NextRequest } from "next/server";
import { ErrInvalidFields, ErrPropertyNotFound } from "@/server/constants";
import {
	assertWriteRole,
	getClientIp,
	handleError,
	ok,
	parseMultipart,
	singleFileBuffer,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import {
	deleteProperty,
	getPropertyById,
	recordAuditEvent,
	updateProperty,
} from "@/server/services";
import {
	getPropertyByIdParamsSchema,
	updatePropertyBodySchema,
	updatePropertyParamsSchema,
} from "@/server/validators/properties/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/properties/[id]" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			const params = getPropertyByIdParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const result = await getPropertyById({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
			});
			if (!result) throw ErrPropertyNotFound;
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/properties/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			assertWriteRole(auth);
			const { id } = await context.params;
			const params = updatePropertyParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const parsed = await parseMultipart(req as NextRequest);
			const body = updatePropertyBodySchema.safeParse(parsed.fields);
			if (!body.success) throw ErrInvalidFields;

			const image = singleFileBuffer(parsed, "image");
			const result = await updateProperty({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
				payload: { ...body.data, image },
			});
			if (!result) throw ErrPropertyNotFound;

			return ok(result, "Property updated successfully");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/properties/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			assertWriteRole(auth);
			const { id } = await context.params;
			const params = getPropertyByIdParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const result = await deleteProperty({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
			});
			void recordAuditEvent({
				ownerId: auth.effectiveOwnerId,
				actorId: auth.userId,
				organizationId: auth.organizationId ?? undefined,
				action: "delete",
				entityType: "property",
				entityId: params.data.id,
				description: `Deleted property (cascaded ${result.units} units, ${result.tenants} tenants)`,
				ip: getClientIp(req),
			});
			return ok(result, "Property deleted");
		} catch (error) {
			return handleError(error);
		}
	}),
);
