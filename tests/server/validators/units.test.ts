import { describe, expect, it } from "vitest";
import {
	addUnitBodySchema,
	addUnitParamsSchema,
	getUnitsQuerySchema,
	unitParamsSchema,
	updateUnitBodySchema,
} from "@/server/validators/units/validate";

describe("addUnitBodySchema", () => {
	it("accepts a valid unit", () => {
		const result = addUnitBodySchema.safeParse({ name: "A1", rent: 1500 });
		expect(result.success).toBe(true);
		expect(result.data).toEqual({ name: "A1", rent: 1500 });
	});

	it("does NOT coerce rent — string rent is rejected", () => {
		expect(
			addUnitBodySchema.safeParse({ name: "A1", rent: "1500" }).success,
		).toBe(false);
	});

	it("rejects negative rent and accepts zero", () => {
		expect(
			addUnitBodySchema.safeParse({ name: "A1", rent: -1 }).success,
		).toBe(false);
		expect(
			addUnitBodySchema.safeParse({ name: "A1", rent: 0 }).success,
		).toBe(true);
	});

	it("enforces name length 1..200", () => {
		expect(
			addUnitBodySchema.safeParse({ name: "", rent: 10 }).success,
		).toBe(false);
		expect(
			addUnitBodySchema.safeParse({ name: "n".repeat(201), rent: 10 })
				.success,
		).toBe(false);
	});
});

describe("addUnitParamsSchema", () => {
	it("requires a non-empty propertyId and is strict", () => {
		expect(
			addUnitParamsSchema.safeParse({ propertyId: "p1" }).success,
		).toBe(true);
		expect(addUnitParamsSchema.safeParse({ propertyId: "" }).success).toBe(
			false,
		);
		expect(
			addUnitParamsSchema.safeParse({ propertyId: "p1", id: "x" })
				.success,
		).toBe(false);
	});
});

describe("getUnitsQuerySchema", () => {
	it("accepts status filter and coerced limit", () => {
		const result = getUnitsQuerySchema.safeParse({
			status: "Vacant",
			limit: "10",
		});
		expect(result.success).toBe(true);
		expect(result.data?.limit).toBe(10);
	});

	it("rejects unknown status values", () => {
		expect(getUnitsQuerySchema.safeParse({ status: "Free" }).success).toBe(
			false,
		);
		expect(
			getUnitsQuerySchema.safeParse({ status: "Occupied" }).success,
		).toBe(true);
	});

	it("bounds limit to 1..100", () => {
		expect(getUnitsQuerySchema.safeParse({ limit: "0" }).success).toBe(
			false,
		);
		expect(getUnitsQuerySchema.safeParse({ limit: "101" }).success).toBe(
			false,
		);
	});
});

describe("unitParamsSchema", () => {
	it("requires a non-empty id and is strict", () => {
		expect(unitParamsSchema.safeParse({ id: "u1" }).success).toBe(true);
		expect(unitParamsSchema.safeParse({ id: "" }).success).toBe(false);
		expect(unitParamsSchema.safeParse({ id: "u1", extra: 1 }).success).toBe(
			false,
		);
	});
});

describe("updateUnitBodySchema", () => {
	it("accepts an empty body and coerces rent on update", () => {
		expect(updateUnitBodySchema.safeParse({}).success).toBe(true);
		const result = updateUnitBodySchema.safeParse({ rent: "1750.25" });
		expect(result.success).toBe(true);
		expect(result.data?.rent).toBe(1750.25);
	});

	it("is strict and validates provided fields", () => {
		expect(
			updateUnitBodySchema.safeParse({ nickname: "loft" }).success,
		).toBe(false);
		expect(updateUnitBodySchema.safeParse({ name: "" }).success).toBe(
			false,
		);
		expect(updateUnitBodySchema.safeParse({ rent: -1 }).success).toBe(
			false,
		);
	});
});
