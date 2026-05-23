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
	{
		route: "/api/users/2fa/disable",
		// Disabling 2FA requires the password; throttle to slow brute force.
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
			const parsed = totpDisableBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const user = await getUserByIdWithPasswordDB({ id: auth.userId });
			if (!user) throw ErrUserNotFound;

			const passOk = await compare(parsed.data.password, user.password);
			if (!passOk) throw ErrInvalidCredentials;

			// SECURITY: disabling 2FA reduces the auth bar; force re-login on
			// every device so a stolen session that quietly waited out the
			// 2FA-enabled period cannot resurface.
			// See SECURITY_REVIEW.md H7 / S4.
			const updated = await updateUserRawDB({
				id: auth.userId,
				update: {
					$set: {
						"security.twoFactorEnabled": false,
						refreshTokens: [],
					},
					$unset: {
						"security.totpSecret": 1,
						"security.pendingTotpSecret": 1,
						"security.recoveryCodes": 1,
					},
				},
			});
			await invalidateCacheKeys({
				id: auth.userId,
				prewarmWith: updated ?? undefined,
			});

			return ok(null, "Two-factor authentication disabled");
		} catch (error) {
			return handleError(error);
		}
	}),
);
