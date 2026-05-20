import { ErrUserNotFound } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getUserById } from "@/server/services";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/users/user-profile" },
	withAuth(async ({ auth }) => {
		try {
			const result = await getUserById({ id: auth.userId });
			if (!result) throw ErrUserNotFound;
			return ok(result, "Profile fetched successfully");
		} catch (error) {
			return handleError(error);
		}
	}),
);
