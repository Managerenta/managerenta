import { verifyRegistrationResponse } from "@simplewebauthn/server";
import {
	ErrInvalidFields,
	ErrPasskeyChallengeExpired,
	ErrPasskeyVerificationFailed,
} from "@/server/constants";
import {
	consumeChallenge,
	getExpectedOrigins,
	getRpId,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { updateUserRawDB } from "@/server/models";
import { invalidateCacheKeys } from "@/server/services/users/utils";
import { passkeyRegisterVerifyBodySchema } from "@/server/validators/users/passkeys";

export const runtime = "nodejs";

function uint8ToBase64Url(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString("base64url");
}

export const POST = withApiHandler(
	{
		route: "/api/users/passkeys/register/verify",
		// Match the options endpoint — registration is short-lived, so any
		// burst above this is either retry-spam or abuse.
		rateLimit: { windowMs: 5 * 60_000, maxRequests: 20 },
	},
	withAuth(async ({ req, auth }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = passkeyRegisterVerifyBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const stored = await consumeChallenge("reg", auth.userId);
			if (!stored) throw ErrPasskeyChallengeExpired;

			const verification = await verifyRegistrationResponse({
				// biome-ignore lint/suspicious/noExplicitAny: SimpleWebAuthn's
				// RegistrationResponseJSON has narrowly-typed fields the
				// zod schema deliberately leaves opaque; the lib re-validates.
				response: parsed.data.response as any,
				expectedChallenge: stored.challenge,
				expectedOrigin: getExpectedOrigins(req),
				expectedRPID: getRpId(),
				requireUserVerification: false,
			});

			if (!verification.verified || !verification.registrationInfo) {
				throw ErrPasskeyVerificationFailed;
			}

			const info = verification.registrationInfo;
			const credentialId = info.credential.id;
			const label =
				(stored.context?.label as string | undefined)?.trim() ||
				parsed.data.label?.trim() ||
				defaultLabel(req);

			await updateUserRawDB({
				id: auth.userId,
				update: {
					$push: {
						"security.passkeys": {
							credentialId,
							publicKey: uint8ToBase64Url(
								info.credential.publicKey,
							),
							counter: info.credential.counter,
							transports: info.credential.transports ?? [],
							label,
							aaguid: info.aaguid,
							backupEligible:
								info.credentialDeviceType === "multiDevice",
							backupState: info.credentialBackedUp,
							createdAt: new Date(),
						},
					},
				},
			});
			await invalidateCacheKeys({ id: auth.userId });

			return ok(
				{ credentialId, label },
				"Passkey registered successfully",
			);
		} catch (error) {
			return handleError(error);
		}
	}),
);

function defaultLabel(req: Request): string {
	const ua = req.headers.get("user-agent") ?? "";
	if (/iPhone|iPad|iOS/i.test(ua)) return "iPhone passkey";
	if (/Android/i.test(ua)) return "Android passkey";
	if (/Macintosh|Mac OS/i.test(ua)) return "Mac passkey";
	if (/Windows/i.test(ua)) return "Windows passkey";
	return "Passkey";
}
