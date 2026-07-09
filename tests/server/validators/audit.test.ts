import { describe, expect, it } from "vitest";
import { getAuditQuerySchema } from "@/server/validators/audit/validate";

describe("getAuditQuerySchema", () => {
	it("accepts an empty query (everything optional)", () => {
		const result = getAuditQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		expect(result.data).toEqual({});
	});

	it("coerces numeric strings for limit and offset", () => {
		const result = getAuditQuerySchema.safeParse({
			limit: "25",
			offset: "10",
			entityType: "tenant",
			action: "create",
		});
		expect(result.success).toBe(true);
		expect(result.data).toEqual({
			limit: 25,
			offset: 10,
			entityType: "tenant",
			action: "create",
		});
	});

	it("enforces limit boundaries 1..100", () => {
		expect(getAuditQuerySchema.safeParse({ limit: "1" }).success).toBe(
			true,
		);
		expect(getAuditQuerySchema.safeParse({ limit: "100" }).success).toBe(
			true,
		);
		expect(getAuditQuerySchema.safeParse({ limit: "0" }).success).toBe(
			false,
		);
		expect(getAuditQuerySchema.safeParse({ limit: "101" }).success).toBe(
			false,
		);
	});

	it("rejects non-integer and non-numeric limits", () => {
		expect(getAuditQuerySchema.safeParse({ limit: "2.5" }).success).toBe(
			false,
		);
		expect(getAuditQuerySchema.safeParse({ limit: "abc" }).success).toBe(
			false,
		);
	});

	it("enforces offset >= 0", () => {
		expect(getAuditQuerySchema.safeParse({ offset: "0" }).success).toBe(
			true,
		);
		expect(getAuditQuerySchema.safeParse({ offset: "-1" }).success).toBe(
			false,
		);
	});
});
