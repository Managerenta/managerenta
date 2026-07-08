import { describe, expect, it } from "vitest";
import {
	forgotPasswordBodySchema,
	notificationsBodySchema,
	preferencesBodySchema,
	remindersBodySchema,
	resetPasswordBodySchema,
	totpDisableBodySchema,
	totpEnableBodySchema,
	verifyEmailBodySchema,
} from "@/server/validators/users/settings";

describe("preferencesBodySchema", () => {
	it("accepts an empty body and a full valid body", () => {
		expect(preferencesBodySchema.safeParse({}).success).toBe(true);
		const result = preferencesBodySchema.safeParse({
			currency: "NGN",
			dateFormat: "DD/MM/YYYY",
			language: "en",
			timezone: "Africa/Lagos",
			theme: "dark",
		});
		expect(result.success).toBe(true);
		expect(result.data?.theme).toBe("dark");
	});

	it("rejects invalid enum values", () => {
		expect(
			preferencesBodySchema.safeParse({ dateFormat: "DD-MM-YYYY" })
				.success,
		).toBe(false);
		expect(
			preferencesBodySchema.safeParse({ theme: "midnight" }).success,
		).toBe(false);
	});

	it("enforces string length bounds", () => {
		expect(preferencesBodySchema.safeParse({ currency: "N" }).success).toBe(
			false,
		);
		expect(
			preferencesBodySchema.safeParse({ currency: "C".repeat(9) }).success,
		).toBe(false);
		expect(
			preferencesBodySchema.safeParse({ timezone: "T".repeat(21) })
				.success,
		).toBe(false);
	});

	it("is strict: rejects unknown keys", () => {
		expect(
			preferencesBodySchema.safeParse({ fontSize: 14 }).success,
		).toBe(false);
	});
});

describe("notificationsBodySchema", () => {
	it("accepts boolean toggles only", () => {
		expect(
			notificationsBodySchema.safeParse({
				emailEnabled: true,
				smsEnabled: false,
				pushEnabled: true,
				paymentReceived: true,
				paymentOverdue: false,
				tenantMoveIn: true,
				tenantMoveOut: false,
				leaseExpiry: true,
			}).success,
		).toBe(true);
		expect(notificationsBodySchema.safeParse({}).success).toBe(true);
	});

	it("rejects non-boolean values (no coercion)", () => {
		expect(
			notificationsBodySchema.safeParse({ emailEnabled: "true" }).success,
		).toBe(false);
		expect(
			notificationsBodySchema.safeParse({ pushEnabled: 1 }).success,
		).toBe(false);
	});

	it("is strict: rejects unknown keys", () => {
		expect(
			notificationsBodySchema.safeParse({ webhookEnabled: true }).success,
		).toBe(false);
	});
});

describe("remindersBodySchema", () => {
	it("coerces numeric strings and enforces boundaries", () => {
		const result = remindersBodySchema.safeParse({
			rentDueLeadDays: "0",
			overdueRepeatDays: "1",
			leaseExpiryLeadDays: "90",
			autoSendOnDueDay: true,
			autoSendForOverdue: false,
		});
		expect(result.success).toBe(true);
		expect(result.data?.rentDueLeadDays).toBe(0);
		expect(result.data?.overdueRepeatDays).toBe(1);
		expect(result.data?.leaseExpiryLeadDays).toBe(90);
	});

	it("rejects out-of-range values", () => {
		expect(
			remindersBodySchema.safeParse({ rentDueLeadDays: 31 }).success,
		).toBe(false);
		expect(
			remindersBodySchema.safeParse({ overdueRepeatDays: 0 }).success,
		).toBe(false);
		expect(
			remindersBodySchema.safeParse({ overdueRepeatDays: 61 }).success,
		).toBe(false);
		expect(
			remindersBodySchema.safeParse({ leaseExpiryLeadDays: 91 }).success,
		).toBe(false);
	});

	it("rejects non-integer day counts", () => {
		expect(
			remindersBodySchema.safeParse({ rentDueLeadDays: "2.5" }).success,
		).toBe(false);
	});
});

describe("totpEnableBodySchema / totpDisableBodySchema", () => {
	it("enable requires a 6..8 char token", () => {
		expect(totpEnableBodySchema.safeParse({ token: "123456" }).success).toBe(
			true,
		);
		expect(totpEnableBodySchema.safeParse({ token: "12345" }).success).toBe(
			false,
		);
		expect(
			totpEnableBodySchema.safeParse({ token: "123456789" }).success,
		).toBe(false);
	});

	it("disable requires a 6..100 char password, strict", () => {
		expect(
			totpDisableBodySchema.safeParse({ password: "secret1" }).success,
		).toBe(true);
		expect(
			totpDisableBodySchema.safeParse({ password: "short" }).success,
		).toBe(false);
		expect(
			totpDisableBodySchema.safeParse({ password: "secret1", keep: 1 })
				.success,
		).toBe(false);
	});
});

describe("password reset / email verification schemas", () => {
	it("forgotPassword requires a valid email", () => {
		expect(
			forgotPasswordBodySchema.safeParse({ email: "a@b.co" }).success,
		).toBe(true);
		expect(
			forgotPasswordBodySchema.safeParse({ email: "nope" }).success,
		).toBe(false);
	});

	it("resetPassword requires token >= 10 chars and a 6..100 password", () => {
		expect(
			resetPasswordBodySchema.safeParse({
				token: "0123456789",
				newPassword: "newpass1",
			}).success,
		).toBe(true);
		expect(
			resetPasswordBodySchema.safeParse({
				token: "123456789",
				newPassword: "newpass1",
			}).success,
		).toBe(false);
		expect(
			resetPasswordBodySchema.safeParse({
				token: "0123456789",
				newPassword: "short",
			}).success,
		).toBe(false);
	});

	it("verifyEmail requires token >= 10 chars, strict", () => {
		expect(
			verifyEmailBodySchema.safeParse({ token: "0123456789" }).success,
		).toBe(true);
		expect(
			verifyEmailBodySchema.safeParse({ token: "short" }).success,
		).toBe(false);
		expect(
			verifyEmailBodySchema.safeParse({ token: "0123456789", x: 1 })
				.success,
		).toBe(false);
	});
});
