import { ErrInvalidFields, ErrUnauthorized } from "@/server/constants";
import {
	generateRecoveryCodes,
	verifyTotpToken,
} from "@/server/constants/totp";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getUserSecretsDB, updateUserRawDB } from "@/server/models";
import { invalidateCacheKeys } from "@/server/services/users/utils";
import { totpEnableBodySchema } from "@/server/validators/users/settings";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{ route: "/api/users/2fa/enable" },
	withAuth(async ({ req, auth }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = totpEnableBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const secrets = await getUserSecretsDB({ id: auth.userId });
			const pending = secrets?.pendingTotpSecret;
			if (!pending) throw ErrUnauthorized;

			if (!verifyTotpToken(pending, parsed.data.token)) {
				throw ErrUnauthorized;
			}

			const recoveryCodes = generateRecoveryCodes();
			await updateUserRawDB({
				id: auth.userId,
				update: {
					$set: {
						"security.twoFactorEnabled": true,
						"security.totpSecret": pending,
						"security.recoveryCodes": recoveryCodes,
					},
					$unset: { "security.pendingTotpSecret": 1 },
				},
			});
			await invalidateCacheKeys({ id: auth.userId });

			return ok(
				{ recoveryCodes },
				"Two-factor authentication enabled. Save your recovery codes — they will not be shown again.",
			);
		} catch (error) {
			return handleError(error);
		}
	}),
);
