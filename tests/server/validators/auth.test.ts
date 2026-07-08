import { describe, expect, it } from "vitest";
import {
	loginBodySchema,
	loginTwoFactorBodySchema,
} from "@/server/validators/auth/validate";

describe("loginBodySchema", () => {
	it("accepts a valid email + password", () => {
		const result = loginBodySchema.safeParse({
			email: "user@example.com",
			password: "hunter2",
		});
		expect(result.success).toBe(true);
		expect(result.data).toEqual({
			email: "user@example.com",
			password: "hunter2",
		});
	});

	it("rejects malformed emails", () => {
		for (const email of ["not-an-email", "a@b", "a b@c.com", "", "@x.com"]) {
			expect(
				loginBodySchema.safeParse({ email, password: "x" }).success,
			).toBe(false);
		}
	});

	it("enforces password length 1..128", () => {
		const base = { email: "user@example.com" };
		expect(
			loginBodySchema.safeParse({ ...base, password: "" }).success,
		).toBe(false);
		expect(
			loginBodySchema.safeParse({ ...base, password: "a" }).success,
		).toBe(true);
		expect(
			loginBodySchema.safeParse({ ...base, password: "a".repeat(128) })
				.success,
		).toBe(true);
		expect(
			loginBodySchema.safeParse({ ...base, password: "a".repeat(129) })
				.success,
		).toBe(false);
	});

	it("rejects missing fields and wrong types", () => {
		expect(loginBodySchema.safeParse({}).success).toBe(false);
		expect(
			loginBodySchema.safeParse({ email: "a@b.co", password: 123 }).success,
		).toBe(false);
	});

	it("is strict: rejects unexpected keys", () => {
		expect(
			loginBodySchema.safeParse({
				email: "user@example.com",
				password: "pw",
				rememberMe: true,
			}).success,
		).toBe(false);
	});
});

describe("loginTwoFactorBodySchema", () => {
	const ticket = "t".repeat(32);

	it("accepts ticket + 6-digit TOTP token", () => {
		const result = loginTwoFactorBodySchema.safeParse({
			ticket,
			totpToken: "123456",
		});
		expect(result.success).toBe(true);
		expect(result.data?.totpToken).toBe("123456");
	});

	it("accepts ticket + recovery code", () => {
		expect(
			loginTwoFactorBodySchema.safeParse({
				ticket,
				recoveryCode: "abcde-fghij",
			}).success,
		).toBe(true);
	});

	it("accepts ticket + passkey assertion (and passes through extras)", () => {
		const result = loginTwoFactorBodySchema.safeParse({
			ticket,
			passkeyResponse: {
				id: "cred-id",
				rawId: "cred-raw",
				response: { clientDataJSON: "..." },
				type: "public-key",
				extraVendorField: 1,
			},
		});
		expect(result.success).toBe(true);
		expect(
			(result.data?.passkeyResponse as Record<string, unknown>)
				.extraVendorField,
		).toBe(1);
	});

	it("rejects a ticket with no second factor (refine)", () => {
		const result = loginTwoFactorBodySchema.safeParse({ ticket });
		expect(result.success).toBe(false);
	});

	it("rejects TOTP tokens that are not exactly 6 digits", () => {
		for (const totpToken of ["12345", "1234567", "12345a", "12 456"]) {
			expect(
				loginTwoFactorBodySchema.safeParse({ ticket, totpToken })
					.success,
			).toBe(false);
		}
	});

	it("enforces ticket length 20..2048", () => {
		expect(
			loginTwoFactorBodySchema.safeParse({
				ticket: "t".repeat(19),
				totpToken: "123456",
			}).success,
		).toBe(false);
		expect(
			loginTwoFactorBodySchema.safeParse({
				ticket: "t".repeat(20),
				totpToken: "123456",
			}).success,
		).toBe(true);
		expect(
			loginTwoFactorBodySchema.safeParse({
				ticket: "t".repeat(2049),
				totpToken: "123456",
			}).success,
		).toBe(false);
	});

	it("enforces recovery code length 8..64", () => {
		expect(
			loginTwoFactorBodySchema.safeParse({
				ticket,
				recoveryCode: "1234567",
			}).success,
		).toBe(false);
		expect(
			loginTwoFactorBodySchema.safeParse({
				ticket,
				recoveryCode: "12345678",
			}).success,
		).toBe(true);
	});

	it("rejects a passkey assertion with the wrong type literal", () => {
		expect(
			loginTwoFactorBodySchema.safeParse({
				ticket,
				passkeyResponse: {
					id: "x",
					rawId: "y",
					response: {},
					type: "password",
				},
			}).success,
		).toBe(false);
	});

	it("is strict at the top level", () => {
		expect(
			loginTwoFactorBodySchema.safeParse({
				ticket,
				totpToken: "123456",
				extra: true,
			}).success,
		).toBe(false);
	});
});
