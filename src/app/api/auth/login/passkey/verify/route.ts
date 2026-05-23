import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import {
	ErrInvalidAction,
	ErrInvalidFields,
	ErrPasskeyChallengeExpired,
	ErrPasskeyVerificationFailed,
} from "@/server/constants";
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
	getUserByPasskeyCredentialIdDB,
	loginUserDB,
	updateUserRawDB,
} from "@/server/models";
import { invalidateCacheKeys } from "@/server/services/users/utils";
import { passkeyAuthVerifyBodySchema } from "@/server/validators/users/passkeys";

export const runtime = "nodejs";

// Tight per-IP limit: a successful passkey ceremony is a full login, so
// burst limits matter here as much as on the password endpoint.
const PASSKEY_VERIFY_WINDOW_MS = 15 * 60_000;
const PASSKEY_VERIFY_MAX = 20;

function base64UrlToUint8(s: string): Uint8Array<ArrayBuffer> {
	// Copy into an explicit ArrayBuffer-backed Uint8Array. `Buffer.from(...)`
	// returns `Uint8Array<ArrayBufferLike>` (which TS won't narrow to
	// `ArrayBuffer` even after a copy), so we materialise the ArrayBuffer
	// up front and wrap it.
	const buf = Buffer.from(s, "base64url");
	const ab = new ArrayBuffer(buf.byteLength);
	const out = new Uint8Array(ab);
	out.set(buf);
	return out;
}

export const POST = withApiHandler(
	{ route: "/api/auth/login/passkey/verify", rateLimit: false },
	async ({ req }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = passkeyAuthVerifyBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const ip = getClientIp(req);
			const rl = await enforceRateLimit(req, {
				windowMs: PASSKEY_VERIFY_WINDOW_MS,
				maxRequests: PASSKEY_VERIFY_MAX,
				keyGenerator: () => `passkey-verify:${ip}`,
			});
			if (!rl.allowed) {
				return applyRateLimitHeaders(
					fail(429, "Too many attempts, please try again later."),
					rl,
				);
			}

			const stored = await consumeChallenge(
				"auth",
				parsed.data.challengeId,
			);
			if (!stored) throw ErrPasskeyChallengeExpired;

			const credentialId = parsed.data.response.id;
			const owner = await getUserByPasskeyCredentialIdDB({
				credentialId,
			});
			if (!owner) throw ErrPasskeyVerificationFailed;

			const verification = await verifyAuthenticationResponse({
				response: parsed.data.response as unknown as Parameters<
					typeof verifyAuthenticationResponse
				>[0]["response"],
				expectedChallenge: stored.challenge,
				expectedOrigin: getExpectedOrigins(req),
				expectedRPID: getRpId(),
				credential: {
					id: owner.passkey.credentialId,
					publicKey: base64UrlToUint8(owner.passkey.publicKey),
					counter: owner.passkey.counter,
					transports:
						(owner.passkey
							.transports as AuthenticatorTransport[]) ??
						undefined,
				},
				requireUserVerification: false,
			});

			if (!verification.verified) throw ErrPasskeyVerificationFailed;

			// SECURITY: signature counter must strictly increase per spec.
			// A non-increase signals the credential was cloned and replayed.
			// Some authenticators (notably Apple platform) always emit 0 — we
			// allow that special case but reject any other regress.
			const newCounter = verification.authenticationInfo.newCounter;
			if (newCounter < owner.passkey.counter && newCounter !== 0) {
				throw ErrPasskeyVerificationFailed;
			}

			const userId = owner.user._id?.toString();
			if (!userId) throw ErrInvalidAction;

			// Persist updated counter + lastUsedAt. Use arrayFilters so we
			// only touch the matching credential, not the whole array.
			await updateUserRawDB({
				id: userId,
				update: {
					$set: {
						"security.passkeys.$[p].counter": newCounter,
						"security.passkeys.$[p].lastUsedAt": new Date(),
					},
				},
				arrayFilters: [{ "p.credentialId": credentialId }],
			});
			await invalidateCacheKeys({ id: userId });

			const session = await loginUserDB({ id: userId, ip });
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
