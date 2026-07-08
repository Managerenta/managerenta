import { describe, expect, it } from "vitest";
import {
	createMaintenanceBodySchema,
	getMaintenanceQuerySchema,
	maintenanceParamsSchema,
	updateMaintenanceBodySchema,
} from "@/server/validators/maintenance/validate";

const validCreate = {
	propertyId: "prop-1",
	title: "Leaky faucet",
	description: "Kitchen faucet drips constantly",
	category: "plumbing",
};

describe("createMaintenanceBodySchema", () => {
	it("accepts a minimal valid body", () => {
		const result = createMaintenanceBodySchema.safeParse(validCreate);
		expect(result.success).toBe(true);
		expect(result.data?.category).toBe("plumbing");
	});

	it("requires propertyId, title, description and category", () => {
		for (const key of ["propertyId", "title", "description", "category"]) {
			const body: Record<string, unknown> = { ...validCreate };
			delete body[key];
			expect(createMaintenanceBodySchema.safeParse(body).success).toBe(
				false,
			);
		}
	});

	it("rejects unknown categories and priorities", () => {
		expect(
			createMaintenanceBodySchema.safeParse({
				...validCreate,
				category: "gardening",
			}).success,
		).toBe(false);
		expect(
			createMaintenanceBodySchema.safeParse({
				...validCreate,
				priority: "critical",
			}).success,
		).toBe(false);
	});

	it("accepts each priority level", () => {
		for (const priority of ["low", "medium", "high", "urgent"]) {
			expect(
				createMaintenanceBodySchema.safeParse({ ...validCreate, priority })
					.success,
			).toBe(true);
		}
	});

	it("coerces cost from string and rejects negative cost", () => {
		const ok = createMaintenanceBodySchema.safeParse({
			...validCreate,
			cost: "150.50",
		});
		expect(ok.success).toBe(true);
		expect(ok.data?.cost).toBe(150.5);

		expect(
			createMaintenanceBodySchema.safeParse({ ...validCreate, cost: -1 })
				.success,
		).toBe(false);
	});

	it("treats empty-string scheduledDate as undefined and coerces real dates", () => {
		const empty = createMaintenanceBodySchema.safeParse({
			...validCreate,
			scheduledDate: "",
		});
		expect(empty.success).toBe(true);
		expect(empty.data?.scheduledDate).toBeUndefined();

		const dated = createMaintenanceBodySchema.safeParse({
			...validCreate,
			scheduledDate: "2026-08-01",
		});
		expect(dated.success).toBe(true);
		expect(dated.data?.scheduledDate).toBeInstanceOf(Date);
		expect(dated.data?.scheduledDate?.toISOString()).toContain("2026-08-01");
	});

	it("rejects an unparseable scheduledDate", () => {
		expect(
			createMaintenanceBodySchema.safeParse({
				...validCreate,
				scheduledDate: "not-a-date",
			}).success,
		).toBe(false);
	});

	it("enforces title (200) and description (2000) max lengths", () => {
		expect(
			createMaintenanceBodySchema.safeParse({
				...validCreate,
				title: "t".repeat(201),
			}).success,
		).toBe(false);
		expect(
			createMaintenanceBodySchema.safeParse({
				...validCreate,
				description: "d".repeat(2001),
			}).success,
		).toBe(false);
		expect(
			createMaintenanceBodySchema.safeParse({
				...validCreate,
				title: "t".repeat(200),
				description: "d".repeat(2000),
			}).success,
		).toBe(true);
	});
});

describe("updateMaintenanceBodySchema", () => {
	it("accepts an empty body (all optional)", () => {
		expect(updateMaintenanceBodySchema.safeParse({}).success).toBe(true);
	});

	it("accepts each status value and rejects unknown status", () => {
		for (const status of [
			"open",
			"in-progress",
			"on-hold",
			"completed",
			"cancelled",
		]) {
			expect(
				updateMaintenanceBodySchema.safeParse({ status }).success,
			).toBe(true);
		}
		expect(
			updateMaintenanceBodySchema.safeParse({ status: "done" }).success,
		).toBe(false);
	});

	it("treats empty-string completedDate as undefined", () => {
		const result = updateMaintenanceBodySchema.safeParse({
			completedDate: "",
			scheduledDate: "2026-01-15T10:00:00.000Z",
		});
		expect(result.success).toBe(true);
		expect(result.data?.completedDate).toBeUndefined();
		expect(result.data?.scheduledDate).toEqual(
			new Date("2026-01-15T10:00:00.000Z"),
		);
	});

	it("rejects an empty title on update", () => {
		expect(updateMaintenanceBodySchema.safeParse({ title: "" }).success).toBe(
			false,
		);
	});
});

describe("maintenanceParamsSchema", () => {
	it("requires a non-empty id and is strict", () => {
		expect(maintenanceParamsSchema.safeParse({ id: "m1" }).success).toBe(true);
		expect(maintenanceParamsSchema.safeParse({ id: "" }).success).toBe(false);
		expect(
			maintenanceParamsSchema.safeParse({ id: "m1", other: 1 }).success,
		).toBe(false);
	});
});

describe("getMaintenanceQuerySchema", () => {
	it("accepts filters with 'all' sentinels and coerced pagination", () => {
		const result = getMaintenanceQuerySchema.safeParse({
			limit: "10",
			offset: "20",
			status: "all",
			priority: "all",
			propertyId: "p1",
			search: "leak",
		});
		expect(result.success).toBe(true);
		expect(result.data?.limit).toBe(10);
		expect(result.data?.offset).toBe(20);
	});

	it("rejects invalid status/priority filters", () => {
		expect(
			getMaintenanceQuerySchema.safeParse({ status: "closed" }).success,
		).toBe(false);
		expect(
			getMaintenanceQuerySchema.safeParse({ priority: "extreme" }).success,
		).toBe(false);
	});
});
