import { z as zod } from "zod";

export const preferencesBodySchema = zod
	.object({
		currency: zod.string().min(2).max(8).optional(),
		dateFormat: zod
			.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"])
			.optional(),
		language: zod.string().min(2).max(8).optional(),
		timezone: zod.string().min(2).max(20).optional(),
		theme: zod.enum(["light", "dark", "system"]).optional(),
	})
	.strict();

export const notificationsBodySchema = zod
	.object({
		emailEnabled: zod.boolean().optional(),
		smsEnabled: zod.boolean().optional(),
		pushEnabled: zod.boolean().optional(),
		paymentReceived: zod.boolean().optional(),
		paymentOverdue: zod.boolean().optional(),
		tenantMoveIn: zod.boolean().optional(),
		tenantMoveOut: zod.boolean().optional(),
		leaseExpiry: zod.boolean().optional(),
	})
	.strict();

export const remindersBodySchema = zod
	.object({
		rentDueLeadDays: zod.coerce.number().int().min(0).max(30).optional(),
		overdueRepeatDays: zod.coerce.number().int().min(1).max(60).optional(),
		autoSendOnDueDay: zod.boolean().optional(),
		autoSendForOverdue: zod.boolean().optional(),
		leaseExpiryLeadDays: zod.coerce
			.number()
			.int()
			.min(0)
			.max(90)
			.optional(),
	})
	.strict();

export const totpEnableBodySchema = zod
	.object({
		token: zod.string().min(6).max(8),
	})
	.strict();

export const totpDisableBodySchema = zod
	.object({
		password: zod.string().min(6).max(100),
	})
	.strict();

export const forgotPasswordBodySchema = zod
	.object({ email: zod.string().email() })
	.strict();

export const resetPasswordBodySchema = zod
	.object({
		token: zod.string().min(10),
		newPassword: zod.string().min(6).max(100),
	})
	.strict();

export const verifyEmailBodySchema = zod
	.object({ token: zod.string().min(10) })
	.strict();
