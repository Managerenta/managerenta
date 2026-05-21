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

export const loginTwoFactorBodySchema = zod
	.object({
		ticket: zod.string().min(20).max(2048),
		totpToken: zod
			.string()
			.regex(/^\d{6}$/)
			.optional(),
		recoveryCode: zod.string().min(8).max(64).optional(),
	})
	.strict()
	.refine((d) => !!d.totpToken || !!d.recoveryCode, {
		message: "Provide either a TOTP token or a recovery code.",
	});
