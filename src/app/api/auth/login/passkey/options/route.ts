import crypto from "node:crypto";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { ErrInvalidFields } from "@/server/constants";
import {
	applyRateLimitHeaders,
	enforceRateLimit,
	fail,
	getClientIp,
	getRpId,
	handleError,
	ok,
	storeChallenge,
	withApiHandler,
} from "@/server/lib";
import { getUserByEmailDB, getUserSecretsDB } from "@/server/models";
import { passkeyAuthStartBodySchema } from "@/server/validators/users/passkeys";

export const runtime = "nodejs";

// Rate-limit hint: a passwordless flow is unauthenticated, so we have to
// guard it more carefully than the post-password ceremonies. Per-IP is
// enough — the challenge itself is single-use and short-lived.
const PASSKEY_OPTIONS_WINDOW_MS = 5 * 60_000;
const PASSKEY_OPTIONS_MAX = 20;

export const POST = withApiHandler(
	{ route: "/api/auth/login/passkey/options", rateLimit: false },
	async ({ req }) => {
		try {
			let body: unknown = {};
			try {
				body = await req.json();
			} catch {
				body = {};
			}
			const parsed = passkeyAuthStartBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const ip = getClientIp(req);
			const rl = await enforceRateLimit(req, {
				windowMs: PASSKEY_OPTIONS_WINDOW_MS,
				maxRequests: PASSKEY_OPTIONS_MAX,
				keyGenerator: () => `passkey-options:${ip}`,
			});
			if (!rl.allowed) {
				return applyRateLimitHeaders(
					fail(429, "Too many requests, please try again later."),
					rl,
				);
			}

			// Optional email scoping — if the client knows the user, we can
			// hand back that user's credential IDs so the browser does a
			// targeted prompt instead of the discoverable-credential UI.
			// SECURITY: we DO NOT reveal whether the email exists; for an
			// unknown email we still mint options with empty allowCredentials
			// so the response shape is indistinguishable.
			let allowCredentials: {
				id: string;
				transports?: AuthenticatorTransport[];
			}[] = [];
			if (parsed.data.email) {
				const user = await getUserByEmailDB({
					email: parsed.data.email,
				});
				if (user) {
					const secrets = await getUserSecretsDB({
						id: user._id?.toString() ?? "",
					});
					allowCredentials = (secrets?.passkeys ?? []).map((p) => ({
						id: p.credentialId,
						transports:
							(p.transports as AuthenticatorTransport[]) ?? [],
					}));
				}
			}

			const options = await generateAuthenticationOptions({
				rpID: getRpId(),
				userVerification: "preferred",
				allowCredentials,
			});

			// Issue an opaque challenge ID the verify endpoint will quote.
			// The challenge itself stays server-side; the client only sees
			// the WebAuthn options + the challengeId handle.
			const challengeId = crypto.randomBytes(24).toString("base64url");
			await storeChallenge("auth", challengeId, {
				challenge: options.challenge,
			});

			return applyRateLimitHeaders(
				ok({ options, challengeId }, "Passkey challenge issued"),
				rl,
			);
		} catch (error) {
			return handleError(error);
		}
	},
);
