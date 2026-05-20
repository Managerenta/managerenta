import { ErrInvalidFields, ErrUnitNotFound } from "@/server/constants";
import { created, handleError, withApiHandler, withAuth } from "@/server/lib";
import { addUnit } from "@/server/services";
import {
	addUnitBodySchema,
	addUnitParamsSchema,
} from "@/server/validators/units/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withApiHandler<RouteContext>(
	{ route: "/api/properties/[id]/units" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
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
				userId: auth.userId,
			});
			if (!result) throw ErrUnitNotFound;
			return created(result, "Unit added");
		} catch (error) {
			return handleError(error);
		}
	}),
);
