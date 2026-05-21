import crypto from "node:crypto";
import { ErrInvalidFields, hashToken } from "@/server/constants";
import { handleError, ok, withApiHandler } from "@/server/lib";
import { getUserByEmailDB, updateUserRawDB } from "@/server/models";
import { sendNotification } from "@/server/services";
import { forgotPasswordBodySchema } from "@/server/validators/users/settings";

export const runtime = "nodejs";

// Always respond with a generic success so the endpoint doesn't leak existence
// of an account. The reset link is dispatched via the notification transport;
// in dev that prints to the server log.
export const POST = withApiHandler(
	{
		route: "/api/auth/forgot-password",
		rateLimit: { windowMs: 60_000, maxRequests: 5 },
	},
	async ({ req }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = forgotPasswordBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const user = await getUserByEmailDB({ email: parsed.data.email });
			if (user) {
				const token = crypto.randomBytes(32).toString("hex");
				const expires = new Date(Date.now() + 1000 * 60 * 60); // 1h
				// Store ONLY the hash — see SECURITY_REVIEW.md H6.
				// The plaintext leaves the server exactly once, in the
				// outbound email body.
				await updateUserRawDB({
					id: user._id,
					update: {
						$set: {
							"security.passwordResetToken": hashToken(token),
							"security.passwordResetExpires": expires,
						},
					},
				});
				await sendNotification({
					userId: user._id,
					channels: ["email"],
					kind: "password-reset",
					title: "Reset your manageRenta password",
					body: `Use this link within 1 hour to reset your password: /reset-password?token=${token}`,
					to: user.email,
					// Do NOT persist the raw token in notification metadata —
					// the body already carries the user-facing link and a
					// duplicate in `meta` only widens the leak surface
					// (see SECURITY_REVIEW.md H6).
				});
			}
			return ok(
				null,
				"If an account exists for that email, a reset link has been sent.",
			);
		} catch (error) {
			return handleError(error);
		}
	},
);
