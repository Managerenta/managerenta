import { ErrInvalidFields, ErrUserNotFound } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { changePassword } from "@/server/services";
import { changePasswordBodySchema } from "@/server/validators/users/validate";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{
		route: "/api/users/change-password",
		rateLimit: { windowMs: 15 * 60_000, maxRequests: 10 },
	},
	withAuth(async ({ req, auth }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = changePasswordBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const result = await changePassword({
				userId: auth.userId,
				currentPassword: parsed.data.currentPassword,
				newPassword: parsed.data.newPassword,
			});
			if (!result) throw ErrUserNotFound;

			return ok(null, "Password changed successfully");
		} catch (error) {
			return handleError(error);
		}
	}),
);
