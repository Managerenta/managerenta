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

			// SimpleWebAuthn re-validates the inner response shape itself, so
			// we pass the zod-unknown body through as the RegistrationResponseJSON
			// the lib expects (the zod schema deliberately leaves response fields
			// opaque to avoid drifting with spec revisions).
			const verification = await verifyRegistrationResponse({
				response: parsed.data.response as unknown as Parameters<
					typeof verifyRegistrationResponse
				>[0]["response"],
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

			const updated = await updateUserRawDB({
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
			await invalidateCacheKeys({
				id: auth.userId,
				prewarmWith: updated ?? undefined,
			});

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
