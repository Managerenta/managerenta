import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { arn, authorize, resourceScope } from "@/server/iam";
import {
	created,
	handleError,
	parseMultipart,
	singleFileBuffer,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { createProperty, getProperties } from "@/server/services";
import {
	createPropertyBodySchema,
	getPropertiesQuerySchema,
} from "@/server/validators/properties/validate";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{ route: "/api/properties" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(
				auth,
				"properties:Create",
				arn.org.properties(resourceScope(auth)),
				{ req },
			);
			const parsed = await parseMultipart(req as NextRequest);
			const body = createPropertyBodySchema.safeParse(parsed.fields);
			if (!body.success) throw ErrInvalidFields;

			const image = singleFileBuffer(parsed, "image");
			const result = await createProperty({
				payload: { ...body.data, image, userId: auth.effectiveOwnerId },
			});
			if (!result) throw ErrInvalidAction;

			return created(result, "Property created successfully");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const GET = withApiHandler(
	{ route: "/api/properties" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(
				auth,
				"properties:List",
				arn.org.properties(resourceScope(auth)),
				{ req },
			);
			const url = new URL(req.url);
			const queryObj = Object.fromEntries(url.searchParams.entries());
			const query = getPropertiesQuerySchema.safeParse(queryObj);
			if (!query.success) throw ErrInvalidFields;

			const result = await getProperties({
				userId: auth.effectiveOwnerId,
				limit: query.data.limit,
				offset: query.data.offset,
				search: query.data.search,
				type: query.data.type,
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
