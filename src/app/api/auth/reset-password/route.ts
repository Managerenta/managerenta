import { hash } from "bcrypt";
import {
	ErrInvalidAction,
	ErrInvalidFields,
	hashToken,
} from "@/server/constants";
import { handleError, ok, withApiHandler } from "@/server/lib";
import { findUserBySecurityTokenDB, updateUserRawDB } from "@/server/models";
import { resetPasswordBodySchema } from "@/server/validators/users/settings";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{ route: "/api/auth/reset-password" },
	async ({ req }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = resetPasswordBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			// The token in the URL is raw; the DB stores only its hash.
			// See SECURITY_REVIEW.md H6.
			const user = await findUserBySecurityTokenDB({
				field: "passwordResetToken",
				token: hashToken(parsed.data.token),
			});
			if (!user) throw ErrInvalidAction;

			const expires = user.security?.passwordResetExpires;
			if (!expires || new Date(expires).getTime() < Date.now()) {
				throw ErrInvalidAction;
			}

			const hashed = await hash(parsed.data.newPassword, 12);
			// SECURITY: clear refresh tokens — see SECURITY_REVIEW.md H7 / S4.
			// A password reset implies the original password may be
			// compromised; any session that survived from before this reset
			// must die.
			await updateUserRawDB({
				id: user._id,
				update: {
					$set: { password: hashed, refreshTokens: [] },
					$unset: {
						"security.passwordResetToken": 1,
						"security.passwordResetExpires": 1,
					},
				},
			});

			return ok(null, "Password updated. You may now sign in.");
		} catch (error) {
			return handleError(error);
		}
	},
);
