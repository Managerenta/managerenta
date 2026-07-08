import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ErrPropertyNotFound } from "../../../src/server/constants";
import { Property } from "../../../src/server/models/properties";
import { Tenant } from "../../../src/server/models/tenants";
import { Unit } from "../../../src/server/models/units";
import createProperty from "../../../src/server/services/properties/createProperty";
import deleteProperty from "../../../src/server/services/properties/deleteProperty";
import getProperties from "../../../src/server/services/properties/getProperties";
import getPropertyById from "../../../src/server/services/properties/getPropertyById";
import updateProperty from "../../../src/server/services/properties/updateProperty";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import {
	ensureCollectionsReady,
	newId,
	seedProperty,
	seedTenant,
	seedTransaction,
	seedUnit,
} from "../../helpers/seed";

describe("properties service", () => {
	beforeAll(async () => {
		await connectTestDB();
		await ensureCollectionsReady();
	});

	beforeEach(async () => {
		await clearTestDB();
	});

	afterAll(async () => {
		await clearTestDB();
	});

	describe("createProperty", () => {
		it("creates a property without an image and does NOT auto-create unit documents", async () => {
			const userId = newId();
			const result = await createProperty({
				payload: {
					name: "Sunset Villas",
					address: "12 Palm Road",
					type: "Apartment",
					totalUnits: 3,
					userId,
				},
			});

			expect(result).not.toBeNull();
			expect(result?.name).toBe("Sunset Villas");
			expect(result?.userId).toBe(userId);
			// The image upload silently no-ops when no buffer is provided.
			expect(result?.image).toBeUndefined();
			// totalUnits is just a counter on the property document...
			expect(result?.totalUnits).toBe(3);
			// ...creating a property never fabricates unit documents.
			const units = await Unit.countDocuments({ userId });
			expect(units).toBe(0);
		});

		it("returns null when required schema fields are missing", async () => {
			const result = await createProperty({
				// name/address missing → mongoose validation fails inside
				// createPropertyDB, which swallows and returns null.
				payload: { type: "House", userId: newId() } as never,
			});
			expect(result).toBeNull();
		});
	});

	describe("updateProperty", () => {
		it("applies a partial payload without clobbering other fields", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({
				userId,
				name: "Old Name",
				address: "Original Address",
				monthlyRent: 500,
			});

			const updated = await updateProperty({
				id: propertyId,
				userId,
				payload: { name: "New Name" },
			});

			expect(updated?.name).toBe("New Name");
			expect(updated?.address).toBe("Original Address");
			expect(updated?.monthlyRent).toBe(500);
		});

		it("is scoped to the owner: another user's update returns null", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({ userId });

			const result = await updateProperty({
				id: propertyId,
				userId: newId(),
				payload: { name: "Hijacked" },
			});
			expect(result).toBeNull();

			const doc = await Property.findById(propertyId).lean();
			expect(doc?.name).not.toBe("Hijacked");
		});
	});

	describe("getProperties (Redis cached)", () => {
		it("computes on first call, serves cache on second, and recomputes after invalidation", async () => {
			const userId = newId();
			await seedProperty({ userId, name: "Alpha", totalUnits: 2 });

			const first = await getProperties({ userId });
			expect(first.total).toBe(1);
			expect(first.stats.totalProperties).toBe(1);
			expect(first.stats.totalUnits).toBe(2);

			// Insert directly at the model layer — bypasses service-side
			// cache invalidation, so a second read must serve the stale cache.
			await seedProperty({ userId, name: "Beta", totalUnits: 4 });
			const second = await getProperties({ userId });
			expect(second.total).toBe(1);

			// refreshCache bypasses the cache and re-populates it.
			const forced = await getProperties({ userId, refreshCache: true });
			expect(forced.total).toBe(2);
			expect(forced.stats.totalUnits).toBe(6);
		});

		it("createProperty invalidates the list cache", async () => {
			const userId = newId();
			await seedProperty({ userId, name: "Alpha" });

			const first = await getProperties({ userId });
			expect(first.total).toBe(1);

			await createProperty({
				payload: {
					name: "Via Service",
					address: "2 Cache Street",
					type: "House",
					totalUnits: 0,
					userId,
				},
			});

			const afterCreate = await getProperties({ userId });
			expect(afterCreate.total).toBe(2);
			expect(
				afterCreate.data.map((p) => p.name).sort(),
			).toEqual(["Alpha", "Via Service"]);
		});
	});

	describe("getPropertyById", () => {
		it("aggregates units, vacancy, rent collected this year and top paying tenants", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({
				userId,
				name: "Aggregate Court",
				totalUnits: 3,
			});

			// Two occupied units (embedded tenant snapshots) + one vacant.
			const { unitId: u1 } = await seedUnit({
				userId,
				propertyId,
				name: "A1",
				rent: 2000,
			});
			const { tenantId: t1 } = await seedTenant({
				userId,
				propertyId,
				unitId: u1,
				name: "Rich Tenant",
			});
			await Unit.findByIdAndUpdate(u1, {
				$set: {
					status: "Occupied",
					tenant: { tenantId: t1, name: "Rich Tenant" },
				},
			});

			const { unitId: u2 } = await seedUnit({
				userId,
				propertyId,
				name: "A2",
				rent: 1000,
			});
			const { tenantId: t2 } = await seedTenant({
				userId,
				propertyId,
				unitId: u2,
				name: "Modest Tenant",
			});
			await Unit.findByIdAndUpdate(u2, {
				$set: {
					status: "Occupied",
					tenant: { tenantId: t2, name: "Modest Tenant" },
				},
			});

			await seedUnit({
				userId,
				propertyId,
				name: "A3",
				rent: 500,
				vacantDays: 10,
			});

			// Rent credits this year: 2000 + 1500. A debit must not count.
			await seedTransaction({ userId, tenantId: t1, amount: 2000 });
			await seedTransaction({ userId, tenantId: t2, amount: 1500 });
			await seedTransaction({
				userId,
				tenantId: t1,
				amount: 999,
				amountType: "debit",
				type: "maintenance",
			});

			const result = await getPropertyById({ id: propertyId, userId });

			expect(result).not.toBeNull();
			expect(result?.units).toHaveLength(3);
			expect(result?.rentCollectedThisYear).toBe(3500);
			expect(result?.averageVacancyDays).toBe(10);
			expect(
				result?.topPayingTenants.map((t) => [t.name, t.monthlyRent]),
			).toEqual([
				["Rich Tenant", 2000],
				["Modest Tenant", 1000],
			]);

			// Cached: direct model change is invisible until invalidation.
			await Property.findByIdAndUpdate(propertyId, {
				$set: { name: "Renamed Behind Cache" },
			});
			const cached = await getPropertyById({ id: propertyId, userId });
			expect(cached?.name).toBe("Aggregate Court");

			const fresh = await getPropertyById({
				id: propertyId,
				userId,
				refreshCache: true,
			});
			expect(fresh?.name).toBe("Renamed Behind Cache");
		});

		it("returns null for another owner's property", async () => {
			const { propertyId } = await seedProperty({ userId: newId() });
			const result = await getPropertyById({
				id: propertyId,
				userId: newId(),
			});
			expect(result).toBeNull();
		});
	});

	describe("deleteProperty", () => {
		it("soft-deletes the property and cascades to its units and tenants", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({ userId, propertyId });
			const { tenantId } = await seedTenant({
				userId,
				propertyId,
				unitId,
			});
			await seedUnit({ userId, propertyId });

			const counts = await deleteProperty({ id: propertyId, userId });
			expect(counts).toEqual({ units: 2, tenants: 1 });

			const property = await Property.findById(propertyId).lean();
			expect(property?.deleted).toBe(true);
			const unit = await Unit.findById(unitId).lean();
			expect(unit?.deleted).toBe(true);
			const tenant = await Tenant.findById(tenantId).lean();
			expect(tenant?.deleted).toBe(true);
		});

		it("throws ErrPropertyNotFound for a foreign or missing property", async () => {
			const { propertyId } = await seedProperty({ userId: newId() });
			await expect(
				deleteProperty({ id: propertyId, userId: newId() }),
			).rejects.toBe(ErrPropertyNotFound);
			await expect(
				deleteProperty({ id: newId(), userId: newId() }),
			).rejects.toBe(ErrPropertyNotFound);
		});
	});
});
