import { describe, expect, it } from "vitest";
import {
	createVendorBodySchema,
	getVendorsQuerySchema,
	updateVendorBodySchema,
	vendorParamsSchema,
} from "@/server/validators/vendors/validate";

const validVendor = { name: "Pipes R Us", specialty: "plumbing" };

describe("createVendorBodySchema", () => {
	it("accepts a minimal valid vendor", () => {
		const result = createVendorBodySchema.safeParse(validVendor);
		expect(result.success).toBe(true);
		expect(result.data).toEqual(validVendor);
	});

	it("accepts every specialty and rejects unknown ones", () => {
		for (const specialty of [
			"plumbing",
			"electrical",
			"hvac",
			"appliance",
			"structural",
			"pest",
			"cleaning",
			"general",
			"other",
		]) {
			expect(
				createVendorBodySchema.safeParse({ ...validVendor, specialty })
					.success,
			).toBe(true);
		}
		expect(
			createVendorBodySchema.safeParse({
				...validVendor,
				specialty: "landscaping",
			}).success,
		).toBe(false);
	});

	it("coerces rating and bounds it to 0..5", () => {
		const ok = createVendorBodySchema.safeParse({
			...validVendor,
			rating: "4.5",
		});
		expect(ok.success).toBe(true);
		expect(ok.data?.rating).toBe(4.5);

		expect(
			createVendorBodySchema.safeParse({ ...validVendor, rating: 5 })
				.success,
		).toBe(true);
		expect(
			createVendorBodySchema.safeParse({ ...validVendor, rating: 5.1 })
				.success,
		).toBe(false);
		expect(
			createVendorBodySchema.safeParse({ ...validVendor, rating: -0.1 })
				.success,
		).toBe(false);
	});

	it("validates optional contact fields", () => {
		expect(
			createVendorBodySchema.safeParse({
				...validVendor,
				email: "not-an-email",
			}).success,
		).toBe(false);
		expect(
			createVendorBodySchema.safeParse({ ...validVendor, phone: "123" })
				.success,
		).toBe(false);
		expect(
			createVendorBodySchema.safeParse({
				...validVendor,
				email: "v@vendor.co",
				phone: "0801234567",
				company: "Pipes Ltd",
				address: "1 Main St",
				notes: "reliable",
			}).success,
		).toBe(true);
	});

	it("requires name and specialty", () => {
		expect(createVendorBodySchema.safeParse({}).success).toBe(false);
		expect(
			createVendorBodySchema.safeParse({ name: "No Specialty" }).success,
		).toBe(false);
	});
});

describe("updateVendorBodySchema", () => {
	it("accepts an empty body (fully partial)", () => {
		expect(updateVendorBodySchema.safeParse({}).success).toBe(true);
	});

	it("still validates provided fields", () => {
		expect(
			updateVendorBodySchema.safeParse({ rating: "6" }).success,
		).toBe(false);
		expect(
			updateVendorBodySchema.safeParse({ specialty: "unknown" }).success,
		).toBe(false);
		expect(updateVendorBodySchema.safeParse({ name: "" }).success).toBe(
			false,
		);
	});
});

describe("vendorParamsSchema", () => {
	it("requires a non-empty id and is strict", () => {
		expect(vendorParamsSchema.safeParse({ id: "v1" }).success).toBe(true);
		expect(vendorParamsSchema.safeParse({ id: "" }).success).toBe(false);
		expect(vendorParamsSchema.safeParse({ id: "v1", x: 1 }).success).toBe(
			false,
		);
	});
});

describe("getVendorsQuerySchema", () => {
	it("accepts 'all' specialty sentinel and coerced pagination", () => {
		const result = getVendorsQuerySchema.safeParse({
			limit: "10",
			offset: "5",
			specialty: "all",
			search: "pipe",
		});
		expect(result.success).toBe(true);
		expect(result.data?.limit).toBe(10);
		expect(result.data?.offset).toBe(5);
	});

	it("rejects invalid specialty and out-of-range pagination", () => {
		expect(
			getVendorsQuerySchema.safeParse({ specialty: "roofing" }).success,
		).toBe(false);
		expect(getVendorsQuerySchema.safeParse({ limit: "101" }).success).toBe(
			false,
		);
		expect(getVendorsQuerySchema.safeParse({ offset: "-1" }).success).toBe(
			false,
		);
	});
});
