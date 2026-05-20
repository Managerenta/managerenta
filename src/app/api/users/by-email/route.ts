import { ErrInvalidFields, ErrUserNotFound } from "@/server/constants";
import { handleError, ok, withApiHandler } from "@/server/lib";
import { getUserByEmail } from "@/server/services";
import { getUserByEmailQuerySchema } from "@/server/validators/users/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/users/by-email" },
	async ({ req }) => {
		try {
			const url = new URL(req.url);
			const queryObj = Object.fromEntries(url.searchParams.entries());
			const query = getUserByEmailQuerySchema.safeParse(queryObj);
			if (!query.success) throw ErrInvalidFields;

			const result = await getUserByEmail({ email: query.data.email });
			if (!result) throw ErrUserNotFound;

			return ok(result, "User fetched successfully");
		} catch (error) {
			return handleError(error);
		}
	},
);
