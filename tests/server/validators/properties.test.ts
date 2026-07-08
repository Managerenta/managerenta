import { describe, expect, it } from "vitest";
import {
	createPropertyBodySchema,
	getPropertiesQuerySchema,
	getPropertyByIdParamsSchema,
	updatePropertyBodySchema,
	updatePropertyParamsSchema,
} from "@/server/validators/properties/validate";

const validCreate = {
	name: "Sunset Villas",
	address: "12 Palm Street, Lagos",
	type: "Apartment",
};

describe("createPropertyBodySchema", () => {
	it("accepts a valid body and defaults totalUnits to 0", () => {
		const result = createPropertyBodySchema.safeParse(validCreate);
		expect(result.success).toBe(true);
		expect(result.data?.totalUnits).toBe(0);
	});

	it("coerces numeric strings for totalUnits and monthlyRent", () => {
		const result = createPropertyBodySchema.safeParse({
			...validCreate,
			totalUnits: "12",
			monthlyRent: "2500.75",
		});
		expect(result.success).toBe(true);
		expect(result.data?.totalUnits).toBe(12);
		expect(result.data?.monthlyRent).toBe(2500.75);
	});

	it("accepts every property type and rejects unknown types", () => {
		for (const type of [
			"Apartment",
			"House",
			"Commercial",
			"Land",
			"Studio",
			"Duplex",
			"Highrise",
			"Bungalow",
		]) {
			expect(
				createPropertyBodySchema.safeParse({ ...validCreate, type })
					.success,
			).toBe(true);
		}
		expect(
			createPropertyBodySchema.safeParse({ ...validCreate, type: "Castle" })
				.success,
		).toBe(false);
	});

	it("rejects negative or fractional totalUnits", () => {
		expect(
			createPropertyBodySchema.safeParse({ ...validCreate, totalUnits: -1 })
				.success,
		).toBe(false);
		expect(
			createPropertyBodySchema.safeParse({
				...validCreate,
				totalUnits: "2.5",
			}).success,
		).toBe(false);
	});

	it("rejects negative monthlyRent", () => {
		expect(
			createPropertyBodySchema.safeParse({
				...validCreate,
				monthlyRent: -100,
			}).success,
		).toBe(false);
	});

	it("enforces name/address/description length caps", () => {
		expect(
			createPropertyBodySchema.safeParse({ ...validCreate, name: "" })
				.success,
		).toBe(false);
		expect(
			createPropertyBodySchema.safeParse({
				...validCreate,
				address: "a".repeat(501),
			}).success,
		).toBe(false);
		expect(
			createPropertyBodySchema.safeParse({
				...validCreate,
				description: "d".repeat(1001),
			}).success,
		).toBe(false);
	});
});

describe("getPropertiesQuerySchema", () => {
	it("accepts an empty query and full filters", () => {
		expect(getPropertiesQuerySchema.safeParse({}).success).toBe(true);
		const result = getPropertiesQuerySchema.safeParse({
			limit: "20",
			offset: "40",
			search: "villa",
			type: "all",
			sort: "occupancy",
		});
		expect(result.success).toBe(true);
		expect(result.data?.limit).toBe(20);
		expect(result.data?.offset).toBe(40);
	});

	it("rejects invalid sort keys and types", () => {
		expect(
			getPropertiesQuerySchema.safeParse({ sort: "price" }).success,
		).toBe(false);
		expect(
			getPropertiesQuerySchema.safeParse({ type: "Mansion" }).success,
		).toBe(false);
	});

	it("is strict: rejects unknown query params", () => {
		expect(
			getPropertiesQuerySchema.safeParse({ page: "2" }).success,
		).toBe(false);
	});

	it("bounds limit to 1..100", () => {
		expect(getPropertiesQuerySchema.safeParse({ limit: "0" }).success).toBe(
			false,
		);
		expect(getPropertiesQuerySchema.safeParse({ limit: "100" }).success).toBe(
			true,
		);
		expect(getPropertiesQuerySchema.safeParse({ limit: "101" }).success).toBe(
			false,
		);
	});
});

describe("getPropertyByIdParamsSchema / updatePropertyParamsSchema", () => {
	it("require a non-empty id and are strict", () => {
		for (const schema of [
			getPropertyByIdParamsSchema,
			updatePropertyParamsSchema,
		]) {
			expect(schema.safeParse({ id: "p1" }).success).toBe(true);
			expect(schema.safeParse({ id: "" }).success).toBe(false);
			expect(schema.safeParse({ id: "p1", x: 1 }).success).toBe(false);
		}
	});
});

describe("updatePropertyBodySchema", () => {
	it("accepts an empty body (all optional)", () => {
		expect(updatePropertyBodySchema.safeParse({}).success).toBe(true);
	});

	it("requires totalUnits >= 1 on update (unlike create)", () => {
		expect(
			updatePropertyBodySchema.safeParse({ totalUnits: "0" }).success,
		).toBe(false);
		const ok = updatePropertyBodySchema.safeParse({ totalUnits: "1" });
		expect(ok.success).toBe(true);
		expect(ok.data?.totalUnits).toBe(1);
	});

	it("accepts an image string and rejects bad enum values", () => {
		expect(
			updatePropertyBodySchema.safeParse({ image: "s3://key" }).success,
		).toBe(true);
		expect(
			updatePropertyBodySchema.safeParse({ type: "Tent" }).success,
		).toBe(false);
	});
});
