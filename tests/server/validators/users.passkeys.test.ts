import { describe, expect, it } from "vitest";
import {
	passkeyAuthStartBodySchema,
	passkeyAuthVerifyBodySchema,
	passkeyRegisterStartBodySchema,
	passkeyRegisterVerifyBodySchema,
	passkeyTwoFactorStartBodySchema,
} from "@/server/validators/users/passkeys";

const validResponse = {
	id: "credential-id",
	rawId: "raw-credential-id",
	response: { clientDataJSON: "base64url..." },
	type: "public-key",
};

describe("passkeyRegisterStartBodySchema", () => {
	it("accepts an empty body and a trimmed label", () => {
		expect(passkeyRegisterStartBodySchema.safeParse({}).success).toBe(true);
		const result = passkeyRegisterStartBodySchema.safeParse({
			label: "  My YubiKey  ",
		});
		expect(result.success).toBe(true);
		expect(result.data?.label).toBe("My YubiKey");
	});

	it("rejects a whitespace-only label (empty after trim)", () => {
		expect(
			passkeyRegisterStartBodySchema.safeParse({ label: "   " }).success,
		).toBe(false);
	});

	it("caps the label at 60 chars and is strict", () => {
		expect(
			passkeyRegisterStartBodySchema.safeParse({ label: "L".repeat(61) })
				.success,
		).toBe(false);
		expect(
			passkeyRegisterStartBodySchema.safeParse({ nickname: "x" }).success,
		).toBe(false);
	});
});

describe("passkeyRegisterVerifyBodySchema", () => {
	it("requires a webauthn response container", () => {
		expect(
			passkeyRegisterVerifyBodySchema.safeParse({
				response: validResponse,
			}).success,
		).toBe(true);
		expect(passkeyRegisterVerifyBodySchema.safeParse({}).success).toBe(
			false,
		);
	});

	it("rejects a response with the wrong type literal or missing ids", () => {
		expect(
			passkeyRegisterVerifyBodySchema.safeParse({
				response: { ...validResponse, type: "password" },
			}).success,
		).toBe(false);
		expect(
			passkeyRegisterVerifyBodySchema.safeParse({
				response: { ...validResponse, id: "" },
			}).success,
		).toBe(false);
	});

	it("passes through vendor extension fields inside the response", () => {
		const result = passkeyRegisterVerifyBodySchema.safeParse({
			label: "Phone",
			response: { ...validResponse, vendorExtra: { hint: 1 } },
		});
		expect(result.success).toBe(true);
		expect(
			(result.data?.response as Record<string, unknown>).vendorExtra,
		).toEqual({ hint: 1 });
	});
});

describe("passkeyAuthStartBodySchema", () => {
	it("accepts an empty body (discoverable-credential flow)", () => {
		expect(passkeyAuthStartBodySchema.safeParse({}).success).toBe(true);
	});

	it("trims and lowercases the email hint", () => {
		const result = passkeyAuthStartBodySchema.safeParse({
			email: "  USER@Example.COM ",
		});
		expect(result.success).toBe(true);
		expect(result.data?.email).toBe("user@example.com");
	});

	it("is strict: rejects unknown keys", () => {
		expect(
			passkeyAuthStartBodySchema.safeParse({ username: "x" }).success,
		).toBe(false);
	});
});

describe("passkeyAuthVerifyBodySchema", () => {
	it("requires challengeId 8..128 and a response", () => {
		expect(
			passkeyAuthVerifyBodySchema.safeParse({
				challengeId: "abcd1234",
				response: validResponse,
			}).success,
		).toBe(true);
		expect(
			passkeyAuthVerifyBodySchema.safeParse({
				challengeId: "abcd123",
				response: validResponse,
			}).success,
		).toBe(false);
		expect(
			passkeyAuthVerifyBodySchema.safeParse({
				challengeId: "c".repeat(129),
				response: validResponse,
			}).success,
		).toBe(false);
		expect(
			passkeyAuthVerifyBodySchema.safeParse({ challengeId: "abcd1234" })
				.success,
		).toBe(false);
	});
});

describe("passkeyTwoFactorStartBodySchema", () => {
	it("requires a ticket 20..2048 chars, strict", () => {
		expect(
			passkeyTwoFactorStartBodySchema.safeParse({
				ticket: "t".repeat(20),
			}).success,
		).toBe(true);
		expect(
			passkeyTwoFactorStartBodySchema.safeParse({
				ticket: "t".repeat(19),
			}).success,
		).toBe(false);
		expect(
			passkeyTwoFactorStartBodySchema.safeParse({
				ticket: "t".repeat(2049),
			}).success,
		).toBe(false);
		expect(
			passkeyTwoFactorStartBodySchema.safeParse({
				ticket: "t".repeat(20),
				extra: 1,
			}).success,
		).toBe(false);
	});
});
