import { z as zod } from "zod";

// WebAuthn responses are structured JSON the browser hands us. Validating
// every field exhaustively is fragile across spec revisions, so we just
// shape-check that the top-level container exists and let
// @simplewebauthn/server reject malformed inner data — its parsers are
// already strict and version-aware.
const webauthnResponseSchema = zod
	.object({
		id: zod.string().min(1),
		rawId: zod.string().min(1),
		response: zod.unknown(),
		type: zod.literal("public-key"),
		clientExtensionResults: zod.unknown().optional(),
		authenticatorAttachment: zod.string().optional(),
	})
	.passthrough();

export const passkeyRegisterStartBodySchema = zod
	.object({
		label: zod.string().trim().min(1).max(60).optional(),
	})
	.strict();

export const passkeyRegisterVerifyBodySchema = zod
	.object({
		label: zod.string().trim().min(1).max(60).optional(),
		response: webauthnResponseSchema,
	})
	.strict();

export const passkeyAuthStartBodySchema = zod
	.object({
		// Optional username/email hint — if present, the server can return a
		// scoped allowCredentials list. Omitted means username-less
		// (discoverable credential) flow.
		email: zod.string().trim().toLowerCase().optional(),
	})
	.strict();

export const passkeyAuthVerifyBodySchema = zod
	.object({
		challengeId: zod.string().min(8).max(128),
		response: webauthnResponseSchema,
	})
	.strict();

export const passkeyTwoFactorStartBodySchema = zod
	.object({
		ticket: zod.string().min(20).max(2048),
	})
	.strict();
