import { z as zod } from "zod";

const patternEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const loginBodySchema = zod
	.object({
		email: zod.email({
			pattern: patternEmail,
		}),
		password: zod.string().min(1).max(128),
	})
	.strict();

const passkeyAssertionSchema = zod
	.object({
		id: zod.string().min(1),
		rawId: zod.string().min(1),
		response: zod.unknown(),
		type: zod.literal("public-key"),
		clientExtensionResults: zod.unknown().optional(),
		authenticatorAttachment: zod.string().optional(),
	})
	.passthrough();

export const loginTwoFactorBodySchema = zod
	.object({
		ticket: zod.string().min(20).max(2048),
		totpToken: zod
			.string()
			.regex(/^\d{6}$/)
			.optional(),
		recoveryCode: zod.string().min(8).max(64).optional(),
		passkeyResponse: passkeyAssertionSchema.optional(),
	})
	.strict()
	.refine((d) => !!d.totpToken || !!d.recoveryCode || !!d.passkeyResponse, {
		message:
			"Provide a TOTP token, a recovery code, or a passkey response.",
	});
