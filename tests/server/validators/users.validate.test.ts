import { describe, expect, it } from "vitest";
import {
	changePasswordBodySchema,
	createUserBodySchema,
	getUserByEmailQuerySchema,
	getUserByIdParamsSchema,
	getUsersByEmailsBodySchema,
	getUsersByEmailsQuerySchema,
	getUsersByIdsBodySchema,
	getUsersByIdsQuerySchema,
	updateUserBodySchema,
} from "@/server/validators/users/validate";

const validUser = {
	username: "jdoe",
	email: "jdoe@example.com",
	password: "secret1",
	name: "John Doe",
};

describe("createUserBodySchema", () => {
	it("accepts a valid signup body", () => {
		const result = createUserBodySchema.safeParse(validUser);
		expect(result.success).toBe(true);
		expect(result.data).toEqual(validUser);
	});

	it("enforces username length 3..30", () => {
		expect(
			createUserBodySchema.safeParse({ ...validUser, username: "ab" })
				.success,
		).toBe(false);
		expect(
			createUserBodySchema.safeParse({ ...validUser, username: "abc" })
				.success,
		).toBe(true);
		expect(
			createUserBodySchema.safeParse({
				...validUser,
				username: "u".repeat(31),
			}).success,
		).toBe(false);
	});

	it("enforces password length 6..100", () => {
		expect(
			createUserBodySchema.safeParse({ ...validUser, password: "12345" })
				.success,
		).toBe(false);
		expect(
			createUserBodySchema.safeParse({ ...validUser, password: "123456" })
				.success,
		).toBe(true);
		expect(
			createUserBodySchema.safeParse({
				...validUser,
				password: "p".repeat(101),
			}).success,
		).toBe(false);
	});

	it("rejects malformed emails (custom pattern)", () => {
		for (const email of ["plain", "a@b", "a b@c.io", "x@y .com"]) {
			expect(
				createUserBodySchema.safeParse({ ...validUser, email }).success,
			).toBe(false);
		}
	});

	it("is strict: rejects unknown keys and missing fields", () => {
		expect(
			createUserBodySchema.safeParse({ ...validUser, role: "admin" })
				.success,
		).toBe(false);
		expect(createUserBodySchema.safeParse({}).success).toBe(false);
	});
});

describe("updateUserBodySchema", () => {
	it("accepts an empty body (fully partial)", () => {
		expect(updateUserBodySchema.safeParse({}).success).toBe(true);
	});

	it("accepts a phone field with length 7..20", () => {
		expect(
			updateUserBodySchema.safeParse({ phone: "0801234567" }).success,
		).toBe(true);
		expect(updateUserBodySchema.safeParse({ phone: "123" }).success).toBe(
			false,
		);
	});

	it("still validates partial fields and stays strict", () => {
		expect(updateUserBodySchema.safeParse({ username: "ab" }).success).toBe(
			false,
		);
		expect(updateUserBodySchema.safeParse({ isAdmin: true }).success).toBe(
			false,
		);
	});
});

describe("changePasswordBodySchema", () => {
	it("requires both passwords with length 6..100", () => {
		expect(
			changePasswordBodySchema.safeParse({
				currentPassword: "oldpass",
				newPassword: "newpass",
			}).success,
		).toBe(true);
		expect(
			changePasswordBodySchema.safeParse({
				currentPassword: "old",
				newPassword: "newpass",
			}).success,
		).toBe(false);
		expect(
			changePasswordBodySchema.safeParse({ currentPassword: "oldpass" })
				.success,
		).toBe(false);
	});
});

describe("getUserByEmailQuerySchema / getUserByIdParamsSchema", () => {
	it("validates the email query", () => {
		expect(
			getUserByEmailQuerySchema.safeParse({ email: "a@b.co" }).success,
		).toBe(true);
		expect(
			getUserByEmailQuerySchema.safeParse({ email: "nope" }).success,
		).toBe(false);
	});

	it("id params require a string id, strict", () => {
		expect(getUserByIdParamsSchema.safeParse({ id: "u1" }).success).toBe(
			true,
		);
		expect(getUserByIdParamsSchema.safeParse({ id: 5 }).success).toBe(
			false,
		);
		expect(
			getUserByIdParamsSchema.safeParse({ id: "u1", other: 1 }).success,
		).toBe(false);
	});
});

describe("getUsersByIdsBodySchema / getUsersByEmailsBodySchema", () => {
	it("require at least one entry", () => {
		expect(getUsersByIdsBodySchema.safeParse({ ids: [] }).success).toBe(
			false,
		);
		expect(
			getUsersByIdsBodySchema.safeParse({ ids: ["a", "b"] }).success,
		).toBe(true);
		expect(
			getUsersByEmailsBodySchema.safeParse({ emails: [] }).success,
		).toBe(false);
		expect(
			getUsersByEmailsBodySchema.safeParse({ emails: ["a@b.co"] })
				.success,
		).toBe(true);
	});

	it("reject wrong element types", () => {
		expect(getUsersByIdsBodySchema.safeParse({ ids: [1, 2] }).success).toBe(
			false,
		);
	});
});

describe("getUsersByIdsQuerySchema / getUsersByEmailsQuerySchema (pagination)", () => {
	it("applies defaults offset=0 and limit=MAX_LIMIT (50)", () => {
		for (const schema of [
			getUsersByIdsQuerySchema,
			getUsersByEmailsQuerySchema,
		]) {
			const result = schema.safeParse({});
			expect(result.success).toBe(true);
			expect(result.data).toEqual({ offset: 0, limit: 50 });
		}
	});

	it("coerces numeric strings and enforces the MAX_LIMIT cap", () => {
		const ok = getUsersByIdsQuerySchema.safeParse({
			offset: "10",
			limit: "50",
		});
		expect(ok.success).toBe(true);
		expect(ok.data).toEqual({ offset: 10, limit: 50 });

		expect(
			getUsersByIdsQuerySchema.safeParse({ limit: "51" }).success,
		).toBe(false);
		expect(getUsersByIdsQuerySchema.safeParse({ limit: "0" }).success).toBe(
			false,
		);
		expect(
			getUsersByIdsQuerySchema.safeParse({ offset: "-1" }).success,
		).toBe(false);
	});
});
