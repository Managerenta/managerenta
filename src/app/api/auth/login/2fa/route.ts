import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import {
	Err2faCodeInvalid,
	Err2faTicketInvalid,
	ErrInvalidAction,
	ErrInvalidFields,
	ErrPasskeyChallengeExpired,
	ErrPasskeyVerificationFailed,
	verifyTwoFactorTicket,
} from "@/server/constants";
import { verifyTotpToken } from "@/server/constants/totp";
import {
	applyRateLimitHeaders,
	consumeChallenge,
	created,
	enforceRateLimit,
	fail,
	getClientIp,
	getExpectedOrigins,
	getRpId,
	handleError,
	setAuthCookies,
	withApiHandler,
} from "@/server/lib";
import {
	getUserSecretsDB,
	loginUserDB,
	updateUserRawDB,
} from "@/server/models";
import { loginTwoFactorBodySchema } from "@/server/validators/auth/validate";

function base64UrlToUint8(s: string): Uint8Array<ArrayBuffer> {
	const buf = Buffer.from(s, "base64url");
	const ab = new ArrayBuffer(buf.byteLength);
	const out = new Uint8Array(ab);
	out.set(buf);
	return out;
}

export const runtime = "nodejs";

// Tight window because the attacker already proved password knowledge to
// even reach this endpoint. 10 attempts per ticket is enough for legitimate
// typos and recovery-code retries; well below brute-force feasibility on a
// 6-digit TOTP within the 5-minute ticket lifetime.
const TWO_FACTOR_WINDOW_MS = 5 * 60_000;
const TWO_FACTOR_MAX_ATTEMPTS = 10;

export const POST = withApiHandler(
	{ route: "/api/auth/login/2fa", rateLimit: false },
	async ({ req }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = loginTwoFactorBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const ticket = verifyTwoFactorTicket(parsed.data.ticket);
			if (!ticket) throw Err2faTicketInvalid;

			const ip = getClientIp(req);
			const rl = await enforceRateLimit(req, {
				windowMs: TWO_FACTOR_WINDOW_MS,
				maxRequests: TWO_FACTOR_MAX_ATTEMPTS,
				// Key on the userId carried in the ticket so an attacker
				// cannot fan attempts out across IPs.
				keyGenerator: () => `login-2fa:${ticket.userId}:${ip}`,
			});
			if (!rl.allowed) {
				return applyRateLimitHeaders(
					fail(429, "Too many attempts, please sign in again."),
					rl,
				);
			}

			const secrets = await getUserSecretsDB({ id: ticket.userId });
			// The user must have *some* 2FA material registered. Either a
			// TOTP secret (the traditional flow) or at least one passkey is
			// enough — the password step already proved the account.
			if (!secrets?.totpSecret && !(secrets?.passkeys?.length ?? 0)) {
				throw Err2faTicketInvalid;
			}

			let consumedRecoveryIndex = -1;
			let usedPasskeyCredentialId: string | null = null;
			let newPasskeyCounter = 0;
			let isValid = false;

			if (parsed.data.totpToken && secrets?.totpSecret) {
				isValid = verifyTotpToken(
					secrets.totpSecret,
					parsed.data.totpToken,
				);
			}

			if (!isValid && parsed.data.recoveryCode) {
				const candidate = parsed.data.recoveryCode.trim().toLowerCase();
				const codes = secrets?.recoveryCodes ?? [];
				consumedRecoveryIndex = codes.findIndex(
					(c) => c.toLowerCase() === candidate,
				);
				if (consumedRecoveryIndex >= 0) isValid = true;
			}

			// Passkey path — verify the assertion against the challenge we
			// stashed in the matching /2fa/passkey/options call. The ticket
			// keys the challenge so a client that skipped that step (or
			// whose challenge has expired) fails closed.
			if (!isValid && parsed.data.passkeyResponse) {
				const credentialId = parsed.data.passkeyResponse.id;
				const passkey = (secrets?.passkeys ?? []).find(
					(p) => p.credentialId === credentialId,
				);
				if (!passkey) throw ErrPasskeyVerificationFailed;

				const stored = await consumeChallenge(
					"2fa",
					parsed.data.ticket,
				);
				if (!stored) throw ErrPasskeyChallengeExpired;

				const verification = await verifyAuthenticationResponse({
					// SimpleWebAuthn re-validates the inner JSON shape itself.
					response: parsed.data
						.passkeyResponse as unknown as Parameters<
						typeof verifyAuthenticationResponse
					>[0]["response"],
					expectedChallenge: stored.challenge,
					expectedOrigin: getExpectedOrigins(req),
					expectedRPID: getRpId(),
					credential: {
						id: passkey.credentialId,
						publicKey: base64UrlToUint8(passkey.publicKey),
						counter: passkey.counter,
						transports:
							(passkey.transports as AuthenticatorTransport[]) ??
							undefined,
					},
					requireUserVerification: false,
				});
				if (!verification.verified) {
					throw ErrPasskeyVerificationFailed;
				}
				newPasskeyCounter = verification.authenticationInfo.newCounter;
				// Same clone-detection guardrail as the passwordless verify.
				if (
					newPasskeyCounter < passkey.counter &&
					newPasskeyCounter !== 0
				) {
					throw ErrPasskeyVerificationFailed;
				}
				usedPasskeyCredentialId = credentialId;
				isValid = true;
			}

			if (!isValid) throw Err2faCodeInvalid;

			// Recovery codes are single-use — burn it before issuing the
			// session so a race cannot redeem the same code twice.
			if (consumedRecoveryIndex >= 0) {
				const remaining = [...(secrets?.recoveryCodes ?? [])];
				remaining.splice(consumedRecoveryIndex, 1);
				await updateUserRawDB({
					id: ticket.userId,
					update: {
						$set: { "security.recoveryCodes": remaining },
					},
				});
			}

			// Persist passkey counter so the next ceremony sees the bumped
			// value. Same guardrail as the passwordless flow.
			if (usedPasskeyCredentialId) {
				await updateUserRawDB({
					id: ticket.userId,
					update: {
						$set: {
							"security.passkeys.$[p].counter": newPasskeyCounter,
							"security.passkeys.$[p].lastUsedAt": new Date(),
						},
					},
					arrayFilters: [
						{ "p.credentialId": usedPasskeyCredentialId },
					],
				});
			}

			const session = await loginUserDB({ id: ticket.userId, ip });
			if (!session) throw ErrInvalidAction;

			await setAuthCookies(session);
			return applyRateLimitHeaders(
				created(session, "Login successful"),
				rl,
			);
		} catch (error) {
			return handleError(error);
		}
	},
);
