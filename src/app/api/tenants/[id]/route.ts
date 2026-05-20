import type { NextRequest } from "next/server";
import { ErrInvalidFields, ErrTenantNotFound } from "@/server/constants";
import {
	handleError,
	ok,
	parseMultipart,
	singleFileBuffer,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { deleteTenant, getTenantById, updateTenant } from "@/server/services";
import {
	tenantParamsSchema,
	updateTenantBodySchema,
} from "@/server/validators/tenants/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/tenants/[id]" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			const params = tenantParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const result = await getTenantById({
				id: params.data.id,
				userId: auth.userId,
			});
			if (!result) throw ErrTenantNotFound;
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/tenants/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			const params = tenantParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const parsed = await parseMultipart(req as NextRequest);
			const body = updateTenantBodySchema.safeParse(parsed.fields);
			if (!body.success) throw ErrInvalidFields;

			const avatar = singleFileBuffer(parsed, "avatar");
			const result = await updateTenant({
				id: params.data.id,
				userId: auth.userId,
				payload: { ...body.data, avatar },
			});
			if (!result) throw ErrTenantNotFound;
			return ok(result, "Tenant updated");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/tenants/[id]" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			const params = tenantParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			await deleteTenant({ id: params.data.id, userId: auth.userId });
			return ok(null, "Tenant deleted");
		} catch (error) {
			return handleError(error);
		}
	}),
);
