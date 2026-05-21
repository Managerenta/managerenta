import crypto from "node:crypto";
import { ErrUserNotFound, hashToken } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { updateUserRawDB } from "@/server/models";
import { getUserById, sendNotification } from "@/server/services";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{ route: "/api/auth/request-email-verification" },
	withAuth(async ({ auth }) => {
		try {
			const user = await getUserById({
				id: auth.userId,
				refreshCache: true,
			});
			if (!user) throw ErrUserNotFound;

			const token = crypto.randomBytes(32).toString("hex");
			const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
			// Hash at rest — see SECURITY_REVIEW.md H6.
			await updateUserRawDB({
				id: auth.userId,
				update: {
					$set: {
						"security.emailVerificationToken": hashToken(token),
						"security.emailVerificationExpires": expires,
					},
				},
			});
			await sendNotification({
				userId: auth.userId,
				channels: ["email"],
				kind: "email-verification",
				title: "Verify your email",
				body: `Confirm your email by clicking: /verify-email?token=${token}`,
				to: user.email,
				// See SECURITY_REVIEW.md H6 — don't echo the token in meta.
			});
			return ok(null, "Verification email sent");
		} catch (error) {
			return handleError(error);
		}
	}),
);
