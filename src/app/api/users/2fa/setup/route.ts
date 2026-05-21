import { ErrUserNotFound } from "@/server/constants";
import { buildOtpAuthUrl, generateTotpSecret } from "@/server/constants/totp";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { updateUserRawDB } from "@/server/models";
import { getUserById } from "@/server/services";
import { invalidateCacheKeys } from "@/server/services/users/utils";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{ route: "/api/users/2fa/setup" },
	withAuth(async ({ auth }) => {
		try {
			const user = await getUserById({
				id: auth.userId,
				refreshCache: true,
			});
			if (!user) throw ErrUserNotFound;

			const secret = generateTotpSecret();
			await updateUserRawDB({
				id: auth.userId,
				update: { $set: { "security.pendingTotpSecret": secret } },
			});
			await invalidateCacheKeys({ id: auth.userId });

			const otpauthUrl = buildOtpAuthUrl({
				secret,
				account: user.email,
				issuer: "manageRenta",
			});

			return ok(
				{ secret, otpauthUrl },
				"Scan the QR with your authenticator and verify the code",
			);
		} catch (error) {
			return handleError(error);
		}
	}),
);
