import {
	ErrInvalidAction,
	ErrInvalidFields,
	hashToken,
} from "@/server/constants";
import { handleError, ok, withApiHandler } from "@/server/lib";
import { findUserBySecurityTokenDB, updateUserRawDB } from "@/server/models";
import { verifyEmailBodySchema } from "@/server/validators/users/settings";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{ route: "/api/auth/verify-email" },
	async ({ req }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = verifyEmailBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			// See SECURITY_REVIEW.md H6 — incoming token is raw, stored is hashed.
			const user = await findUserBySecurityTokenDB({
				field: "emailVerificationToken",
				token: hashToken(parsed.data.token),
			});
			if (!user) throw ErrInvalidAction;

			const expires = user.security?.emailVerificationExpires;
			if (expires && new Date(expires).getTime() < Date.now()) {
				throw ErrInvalidAction;
			}

			await updateUserRawDB({
				id: user._id,
				update: {
					$set: { "security.emailVerified": true },
					$unset: {
						"security.emailVerificationToken": 1,
						"security.emailVerificationExpires": 1,
					},
				},
			});

			return ok(null, "Email verified");
		} catch (error) {
			return handleError(error);
		}
	},
);
