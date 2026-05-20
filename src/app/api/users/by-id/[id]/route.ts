import { ErrInvalidFields, ErrUserNotFound } from "@/server/constants";
import { handleError, ok, withApiHandler } from "@/server/lib";
import { getUserById } from "@/server/services";
import { getUserByIdParamsSchema } from "@/server/validators/users/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/users/by-id/[id]" },
	async ({ context }) => {
		try {
			const { id } = await context.params;
			const parsed = getUserByIdParamsSchema.safeParse({ id });
			if (!parsed.success) throw ErrInvalidFields;

			const result = await getUserById({ id: parsed.data.id });
			if (!result) throw ErrUserNotFound;

			return ok(result, "User fetched successfully");
		} catch (error) {
			return handleError(error);
		}
	},
);
