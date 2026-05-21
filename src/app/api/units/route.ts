import { ErrInvalidFields } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getVacantUnits } from "@/server/services";
import { getUnitsQuerySchema } from "@/server/validators/units/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/units" },
	withAuth(async ({ req, auth }) => {
		try {
			const url = new URL(req.url);
			const queryObj = Object.fromEntries(url.searchParams.entries());
			const query = getUnitsQuerySchema.safeParse(queryObj);
			if (!query.success) throw ErrInvalidFields;

			const result = await getVacantUnits({
				userId: auth.effectiveOwnerId,
				status: query.data.status,
				limit: query.data.limit,
			});
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);
