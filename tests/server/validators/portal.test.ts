import { describe, expect, it } from "vitest";
import { portalMaintenanceBodySchema } from "@/server/validators/portal/validate";

describe("portalMaintenanceBodySchema", () => {
	const valid = {
		title: "Broken heater",
		description: "No heat in the living room since Monday",
		category: "hvac",
	};

	it("accepts a valid tenant maintenance request", () => {
		const result = portalMaintenanceBodySchema.safeParse(valid);
		expect(result.success).toBe(true);
		expect(result.data).toEqual(valid);
	});

	it("accepts every category tenants can pick", () => {
		for (const category of [
			"plumbing",
			"electrical",
			"hvac",
			"appliance",
			"structural",
			"pest",
			"cleaning",
			"other",
		]) {
			expect(
				portalMaintenanceBodySchema.safeParse({ ...valid, category })
					.success,
			).toBe(true);
		}
	});

	it("rejects unknown categories (no vendor-only values)", () => {
		expect(
			portalMaintenanceBodySchema.safeParse({
				...valid,
				category: "general",
			}).success,
		).toBe(false);
	});

	it("requires all three fields", () => {
		expect(portalMaintenanceBodySchema.safeParse({}).success).toBe(false);
		expect(
			portalMaintenanceBodySchema.safeParse({
				title: valid.title,
				category: "hvac",
			}).success,
		).toBe(false);
	});

	it("enforces title 1..200 and description 1..2000", () => {
		expect(
			portalMaintenanceBodySchema.safeParse({ ...valid, title: "" })
				.success,
		).toBe(false);
		expect(
			portalMaintenanceBodySchema.safeParse({
				...valid,
				title: "t".repeat(201),
			}).success,
		).toBe(false);
		expect(
			portalMaintenanceBodySchema.safeParse({
				...valid,
				description: "d".repeat(2001),
			}).success,
		).toBe(false);
		expect(
			portalMaintenanceBodySchema.safeParse({
				...valid,
				title: "t".repeat(200),
				description: "d".repeat(2000),
			}).success,
		).toBe(true);
	});
});
