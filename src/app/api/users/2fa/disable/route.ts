import { compare } from "bcrypt";
import {
	ErrInvalidCredentials,
	ErrInvalidFields,
	ErrUserNotFound,
} from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getUserByIdWithPasswordDB, updateUserRawDB } from "@/server/models";
import { invalidateCacheKeys } from "@/server/services/users/utils";
import { totpDisableBodySchema } from "@/server/validators/users/settings";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{ route: "/api/users/2fa/disable" },
	withAuth(async ({ req, auth }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = totpDisableBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const user = await getUserByIdWithPasswordDB({ id: auth.userId });
			if (!user) throw ErrUserNotFound;

			const passOk = await compare(parsed.data.password, user.password);
			if (!passOk) throw ErrInvalidCredentials;

			await updateUserRawDB({
				id: auth.userId,
				update: {
					$set: { "security.twoFactorEnabled": false },
					$unset: {
						"security.totpSecret": 1,
						"security.pendingTotpSecret": 1,
						"security.recoveryCodes": 1,
					},
				},
			});
			await invalidateCacheKeys({ id: auth.userId });

			return ok(null, "Two-factor authentication disabled");
		} catch (error) {
			return handleError(error);
		}
	}),
);
