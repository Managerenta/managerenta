import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ErrInvalidFields, ErrTenantNotFound } from "@/server/constants";
import {
	created,
	handleError,
	parseMultipart,
	singleFileBuffer,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { addTenant, getTenants } from "@/server/services";
import {
	addTenantBodySchema,
	getTenantsQuerySchema,
} from "@/server/validators/tenants/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/tenants" },
	withAuth(async ({ req, auth }) => {
		try {
			const url = new URL(req.url);
			const queryObj = Object.fromEntries(url.searchParams.entries());
			const query = getTenantsQuerySchema.safeParse(queryObj);
			if (!query.success) throw ErrInvalidFields;

			const result = await getTenants({
				userId: auth.userId,
				limit: query.data.limit,
				offset: query.data.offset,
				status: query.data.status,
				search: query.data.search,
				sort: query.data.sort,
			});
			return NextResponse.json(
				{
					code: 200,
					data: result.data,
					total: result.total,
					stats: result.stats,
				},
				{ status: 200 },
			);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler(
	{ route: "/api/tenants" },
	withAuth(async ({ req, auth }) => {
		try {
			const parsed = await parseMultipart(req as NextRequest);
			const body = addTenantBodySchema.safeParse(parsed.fields);
			if (!body.success) throw ErrInvalidFields;

			const avatar = singleFileBuffer(parsed, "avatar");
			const result = await addTenant({
				...body.data,
				userId: auth.userId,
				avatar,
			});
			if (!result) throw ErrTenantNotFound;
			return created(result, "Tenant added");
		} catch (error) {
			return handleError(error);
		}
	}),
);
