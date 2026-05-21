import { ErrInvalidFields, ErrUserNotFound } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { updateUserSettings } from "@/server/services";
import { remindersBodySchema } from "@/server/validators/users/settings";

export const runtime = "nodejs";

export const PATCH = withApiHandler(
	{ route: "/api/users/reminders" },
	withAuth(async ({ req, auth }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = remindersBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const result = await updateUserSettings({
				id: auth.userId,
				section: "reminders",
				payload: parsed.data,
			});
			if (!result) throw ErrUserNotFound;
			return ok(result.reminders, "Reminder settings updated");
		} catch (error) {
			return handleError(error);
		}
	}),
);
