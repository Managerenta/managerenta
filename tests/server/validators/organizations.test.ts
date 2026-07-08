import { describe, expect, it } from "vitest";
import {
	createOrganizationBodySchema,
	deleteOrganizationParamsSchema,
} from "@/server/validators/organizations/validate";

describe("createOrganizationBodySchema", () => {
	const valid = {
		name: "Acme Rentals",
		description: "Property management for Acme",
	};

	it("accepts a minimal valid body", () => {
		const result = createOrganizationBodySchema.safeParse(valid);
		expect(result.success).toBe(true);
		expect(result.data).toEqual(valid);
	});

	it("accepts optional socials and a valid website URL", () => {
		expect(
			createOrganizationBodySchema.safeParse({
				...valid,
				website: "https://acme.example.com",
				x: "@acme",
				instagram: "acme",
				telegram: "acme_channel",
			}).success,
		).toBe(true);
	});

	it("rejects an invalid website URL", () => {
		expect(
			createOrganizationBodySchema.safeParse({
				...valid,
				website: "not a url",
			}).success,
		).toBe(false);
	});

	it("enforces name 1..100 and description 5..256", () => {
		expect(
			createOrganizationBodySchema.safeParse({ ...valid, name: "" }).success,
		).toBe(false);
		expect(
			createOrganizationBodySchema.safeParse({
				...valid,
				name: "n".repeat(101),
			}).success,
		).toBe(false);
		expect(
			createOrganizationBodySchema.safeParse({
				...valid,
				description: "1234",
			}).success,
		).toBe(false);
		expect(
			createOrganizationBodySchema.safeParse({
				...valid,
				description: "12345",
			}).success,
		).toBe(true);
		expect(
			createOrganizationBodySchema.safeParse({
				...valid,
				description: "d".repeat(257),
			}).success,
		).toBe(false);
	});

	it("is strict: rejects unknown keys", () => {
		expect(
			createOrganizationBodySchema.safeParse({ ...valid, plan: "pro" })
				.success,
		).toBe(false);
	});
});

describe("deleteOrganizationParamsSchema", () => {
	it("requires organizationId as a string and is strict", () => {
		expect(
			deleteOrganizationParamsSchema.safeParse({ organizationId: "org-1" })
				.success,
		).toBe(true);
		expect(deleteOrganizationParamsSchema.safeParse({}).success).toBe(false);
		expect(
			deleteOrganizationParamsSchema.safeParse({ organizationId: 42 })
				.success,
		).toBe(false);
		expect(
			deleteOrganizationParamsSchema.safeParse({
				organizationId: "org-1",
				force: true,
			}).success,
		).toBe(false);
	});
});
