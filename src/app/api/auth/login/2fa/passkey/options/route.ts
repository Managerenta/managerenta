import { generateAuthenticationOptions } from "@simplewebauthn/server";
import {
	Err2faTicketInvalid,
	ErrInvalidFields,
	verifyTwoFactorTicket,
} from "@/server/constants";
import {
	getRpId,
	handleError,
	ok,
	storeChallenge,
	withApiHandler,
} from "@/server/lib";
import { getUserSecretsDB } from "@/server/models";
import { passkeyTwoFactorStartBodySchema } from "@/server/validators/users/passkeys";

export const runtime = "nodejs";

// Passkey as a 2FA factor — the caller is mid-login (already proved their
// password) and is choosing passkey over TOTP/recovery for the second step.
// The 2FA ticket pins the user, so we scope allowCredentials to that user's
// registered passkeys — no discoverable-credential fallback here.
export const POST = withApiHandler(
	{
		route: "/api/auth/login/2fa/passkey/options",
		rateLimit: { windowMs: 5 * 60_000, maxRequests: 20 },
	},
	async ({ req }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = passkeyTwoFactorStartBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const ticket = verifyTwoFactorTicket(parsed.data.ticket);
			if (!ticket) throw Err2faTicketInvalid;

			const secrets = await getUserSecretsDB({ id: ticket.userId });
			const passkeys = secrets?.passkeys ?? [];

			const options = await generateAuthenticationOptions({
				rpID: getRpId(),
				userVerification: "preferred",
				allowCredentials: passkeys.map((p) => ({
					id: p.credentialId,
					transports:
						(p.transports as AuthenticatorTransport[]) ?? [],
				})),
			});

			// Key the challenge by the ticket so the verify endpoint (the
			// existing /api/auth/login/2fa) can look it up without a separate
			// challengeId being shuttled through the client.
			await storeChallenge("2fa", parsed.data.ticket, {
				challenge: options.challenge,
			});

			return ok(
				{ options },
				passkeys.length === 0
					? "No passkeys registered on this account"
					: "Passkey 2FA challenge issued",
			);
		} catch (error) {
			return handleError(error);
		}
	},
);
