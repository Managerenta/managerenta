import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getUserSecretsDB } from "@/server/models";

export const runtime = "nodejs";

// Read-only list of the current user's passkeys. Returns user-facing
// metadata only (label, transports, timestamps) — never the publicKey or
// raw credentialId payload more than the client needs to delete it.
export const GET = withApiHandler(
	{ route: "/api/users/passkeys" },
	withAuth(async ({ auth }) => {
		try {
			const secrets = await getUserSecretsDB({ id: auth.userId });
			const passkeys = (secrets?.passkeys ?? []).map((p) => ({
				credentialId: p.credentialId,
				label: p.label,
				transports: p.transports ?? [],
				aaguid: p.aaguid,
				backupEligible: p.backupEligible,
				backupState: p.backupState,
				createdAt: p.createdAt,
				lastUsedAt: p.lastUsedAt,
			}));
			return ok({ passkeys }, "Passkeys retrieved");
		} catch (error) {
			return handleError(error);
		}
	}),
);
