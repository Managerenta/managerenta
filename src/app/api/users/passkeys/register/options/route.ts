import { generateRegistrationOptions } from "@simplewebauthn/server";
import { ErrInvalidFields, ErrUserNotFound } from "@/server/constants";
import {
	getRpId,
	handleError,
	ok,
	storeChallenge,
	WEBAUTHN_RP_NAME,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { getUserSecretsDB } from "@/server/models";
import { getUserById } from "@/server/services";
import { passkeyRegisterStartBodySchema } from "@/server/validators/users/passkeys";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{
		route: "/api/users/passkeys/register/options",
		// Modest rate limit — generating options is cheap but we still don't
		// want a logged-in attacker to spin endless challenges in Redis.
		rateLimit: { windowMs: 5 * 60_000, maxRequests: 20 },
	},
	withAuth(async ({ req, auth }) => {
		try {
			let body: unknown = {};
			try {
				body = await req.json();
			} catch {
				// Empty body is fine — `label` is optional at this step.
				body = {};
			}
			const parsed = passkeyRegisterStartBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const user = await getUserById({ id: auth.userId });
			if (!user) throw ErrUserNotFound;

			const secrets = await getUserSecretsDB({ id: auth.userId });
			const existing = secrets?.passkeys ?? [];

			const options = await generateRegistrationOptions({
				rpName: WEBAUTHN_RP_NAME,
				rpID: getRpId(),
				// userID must be a stable byte string; ObjectId works.
				userID: new TextEncoder().encode(auth.userId),
				userName: user.email,
				userDisplayName: user.name ?? user.email,
				attestationType: "none",
				// Exclude already-registered credentials so the same
				// authenticator can't be enrolled twice — the browser will
				// refuse and we get a clean UX error instead of a silent
				// duplicate row.
				excludeCredentials: existing.map((p) => ({
					id: p.credentialId,
					transports: (p.transports ??
						[]) as AuthenticatorTransport[],
				})),
				authenticatorSelection: {
					residentKey: "preferred",
					userVerification: "preferred",
				},
			});

			// Stash the challenge so verify can prove we generated it.
			// Also carry the user-supplied label across the round-trip; the
			// browser doesn't echo it back.
			await storeChallenge("reg", auth.userId, {
				challenge: options.challenge,
				context: { label: parsed.data.label ?? "" },
			});

			return ok(options, "Passkey registration challenge issued");
		} catch (error) {
			return handleError(error);
		}
	}),
);
