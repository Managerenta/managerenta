import { ErrInvalidFields, ErrUserNotFound } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { updateUserSettings } from "@/server/services";
import { preferencesBodySchema } from "@/server/validators/users/settings";

export const runtime = "nodejs";

export const PATCH = withApiHandler(
	{ route: "/api/users/preferences" },
	withAuth(async ({ req, auth }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = preferencesBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const result = await updateUserSettings({
				id: auth.userId,
				section: "preferences",
				payload: parsed.data,
			});
			if (!result) throw ErrUserNotFound;
			return ok(result.preferences, "Preferences updated");
		} catch (error) {
			return handleError(error);
		}
	}),
);
