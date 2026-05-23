import {
	ErrInvalidFields,
	ErrPasskeyNotFound,
	ErrUserNotFound,
} from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getUserSecretsDB, updateUserRawDB } from "@/server/models";
import { invalidateCacheKeys } from "@/server/services/users/utils";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const DELETE = withApiHandler<RouteContext>(
	{
		route: "/api/users/passkeys/[id]",
		rateLimit: { windowMs: 5 * 60_000, maxRequests: 30 },
	},
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id: rawId } = await context.params;
			const credentialId = decodeURIComponent(rawId ?? "");
			if (!credentialId) throw ErrInvalidFields;

			const secrets = await getUserSecretsDB({ id: auth.userId });
			if (!secrets) throw ErrUserNotFound;
			const exists = (secrets.passkeys ?? []).some(
				(p) => p.credentialId === credentialId,
			);
			if (!exists) throw ErrPasskeyNotFound;

			const updated = await updateUserRawDB({
				id: auth.userId,
				update: {
					$pull: {
						"security.passkeys": { credentialId },
					},
				},
			});
			await invalidateCacheKeys({
				id: auth.userId,
				prewarmWith: updated ?? undefined,
			});

			return ok(null, "Passkey removed");
		} catch (error) {
			return handleError(error);
		}
	}),
);
