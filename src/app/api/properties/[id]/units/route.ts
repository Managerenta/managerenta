import { ErrInvalidFields, ErrTryAgain } from "@/server/constants";
import {
	assertWriteRole,
	created,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { addUnit, getUnitsByProperty } from "@/server/services";
import {
	addUnitBodySchema,
	addUnitParamsSchema,
} from "@/server/validators/units/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/properties/[id]/units" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			const params = addUnitParamsSchema.safeParse({ propertyId: id });
			if (!params.success) throw ErrInvalidFields;

			const units = await getUnitsByProperty({
				propertyId: params.data.propertyId,
				userId: auth.effectiveOwnerId,
			});
			return ok({ units });
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler<RouteContext>(
	{ route: "/api/properties/[id]/units" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			assertWriteRole(auth);
			const { id } = await context.params;
			const params = addUnitParamsSchema.safeParse({ propertyId: id });
			if (!params.success) throw ErrInvalidFields;

			let raw: unknown;
			try {
				raw = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const body = addUnitBodySchema.safeParse(raw);
			if (!body.success) throw ErrInvalidFields;

			const result = await addUnit({
				name: body.data.name,
				rent: body.data.rent,
				propertyId: params.data.propertyId,
				userId: auth.effectiveOwnerId,
			});
			if (!result) throw ErrTryAgain;
			return created(result, "Unit added");
		} catch (error) {
			return handleError(error);
		}
	}),
);
