import mongoose from "mongoose";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { ErrPropertyNotFound } from "../../../src/server/constants";
import { Property } from "../../../src/server/models/properties";
import { Tenant } from "../../../src/server/models/tenants";
import { Unit } from "../../../src/server/models/units";
import addUnit from "../../../src/server/services/units/addUnit";
import deleteUnit from "../../../src/server/services/units/deleteUnit";
import getUnit from "../../../src/server/services/units/getUnit";
import getUnitsByProperty from "../../../src/server/services/units/getUnitsByProperty";
import getVacantUnits from "../../../src/server/services/units/getVacantUnits";
import updateUnit from "../../../src/server/services/units/updateUnit";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import {
	ensureCollectionsReady,
	newId,
	seedProperty,
	seedTenant,
	seedUnit,
} from "../../helpers/seed";

describe("units service", () => {
	beforeAll(async () => {
		await connectTestDB();
		await ensureCollectionsReady();
	});

	beforeEach(async () => {
		await clearTestDB();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await clearTestDB();
	});

	describe("addUnit", () => {
		it("creates a vacant unit and increments the property's totalUnits", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({
				userId,
				totalUnits: 0,
			});

			const unit = await addUnit({
				name: "B1",
				rent: 750,
				propertyId,
				userId,
			});

			expect(unit).not.toBeNull();
			expect(unit?.name).toBe("B1");
			expect(unit?.rent).toBe(750);
			expect(unit?.status).toBe("Vacant");
			expect(unit?.tenant).toBeNull();

			const property = await Property.findById(propertyId).lean();
			expect(property?.totalUnits).toBe(1);
		});

		it("throws ErrPropertyNotFound when the property does not belong to the user", async () => {
			const { propertyId } = await seedProperty({ userId: newId() });
			await expect(
				addUnit({
					name: "X",
					rent: 100,
					propertyId,
					userId: newId(),
				}),
			).rejects.toBe(ErrPropertyNotFound);
		});
	});

	describe("updateUnit", () => {
		it("applies partial payloads and leaves other fields untouched", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({
				userId,
				propertyId,
				name: "C1",
				rent: 900,
			});

			const updated = await updateUnit({
				id: unitId,
				userId,
				payload: { rent: 1200 },
			});
			expect(updated?.rent).toBe(1200);
			expect(updated?.name).toBe("C1");
		});

		it("returns null for a unit owned by someone else", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({ userId, propertyId });

			const result = await updateUnit({
				id: unitId,
				userId: newId(),
				payload: { rent: 1 },
			});
			expect(result).toBeNull();
		});
	});

	describe("getUnit / getUnitsByProperty", () => {
		it("returns the unit scoped to its owner and lists all property units", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({
				userId,
				propertyId,
				name: "D1",
			});
			await seedUnit({ userId, propertyId, name: "D2" });

			const unit = await getUnit({ id: unitId, userId });
			expect(unit?.name).toBe("D1");

			const foreign = await getUnit({ id: unitId, userId: newId() });
			expect(foreign).toBeNull();

			const list = await getUnitsByProperty({ propertyId, userId });
			expect(list.map((u) => u.name).sort()).toEqual(["D1", "D2"]);
		});
	});

	describe("getVacantUnits (Redis cached)", () => {
		it("filters by status, caches, and serves stale data until refreshed", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({
				userId,
				name: "Vacancy Towers",
			});
			await seedUnit({ userId, propertyId, name: "V1" });
			const { unitId: occupiedId } = await seedUnit({
				userId,
				propertyId,
				name: "V2",
			});
			const { tenantId } = await seedTenant({
				userId,
				propertyId,
				unitId: occupiedId,
			});
			await Unit.findByIdAndUpdate(occupiedId, {
				$set: {
					status: "Occupied",
					tenant: { tenantId, name: "Occupant" },
				},
			});

			const vacant = await getVacantUnits({ userId });
			expect(vacant).toHaveLength(1);
			expect(vacant[0].name).toBe("V1");
			// The property lookup is joined onto each vacant unit.
			expect(vacant[0].property?.name).toBe("Vacancy Towers");

			const occupied = await getVacantUnits({
				userId,
				status: "Occupied",
			});
			expect(occupied).toHaveLength(1);
			expect(occupied[0].name).toBe("V2");

			// Direct model insert → cached list unchanged until refreshCache.
			await seedUnit({ userId, propertyId, name: "V3" });
			const cached = await getVacantUnits({ userId });
			expect(cached).toHaveLength(1);

			const fresh = await getVacantUnits({ userId, refreshCache: true });
			expect(fresh.map((u) => u.name).sort()).toEqual(["V1", "V3"]);
		});
	});

	describe("deleteUnit", () => {
		it("soft-deletes an occupied unit, its tenant, and decrements totalUnits (transactional)", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({
				userId,
				totalUnits: 2,
			});
			const { unitId } = await seedUnit({ userId, propertyId });
			const { tenantId } = await seedTenant({
				userId,
				propertyId,
				unitId,
			});
			await Unit.findByIdAndUpdate(unitId, {
				$set: {
					status: "Occupied",
					tenant: { tenantId, name: "Leaving Tenant" },
				},
			});

			const result = await deleteUnit({ id: unitId, userId });
			expect(result).toEqual({ propertyId });

			const unit = await Unit.findById(unitId).lean();
			expect(unit?.deleted).toBe(true);
			const tenant = await Tenant.findById(tenantId).lean();
			expect(tenant?.deleted).toBe(true);
			const property = await Property.findById(propertyId).lean();
			expect(property?.totalUnits).toBe(1);
		});

		it("returns null for missing or foreign units without touching anything", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({
				userId,
				totalUnits: 1,
			});
			const { unitId } = await seedUnit({ userId, propertyId });

			expect(await deleteUnit({ id: newId(), userId })).toBeNull();
			expect(
				await deleteUnit({ id: unitId, userId: newId() }),
			).toBeNull();

			const property = await Property.findById(propertyId).lean();
			expect(property?.totalUnits).toBe(1);
		});

		it("aborts and returns null when the unit soft-delete step fails", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({
				userId,
				totalUnits: 1,
			});
			const { unitId } = await seedUnit({ userId, propertyId });

			// deleteUnitDB swallows the write error and returns null, driving
			// deleteUnit's `if (!deleted)` abort-and-return-null branch.
			// getUnitByIdDB (aggregate) runs first and is unaffected by this
			// findOneAndUpdate-only mock.
			vi.spyOn(Unit, "findOneAndUpdate").mockRejectedValueOnce(
				new Error("delete failed"),
			);

			expect(await deleteUnit({ id: unitId, userId })).toBeNull();

			// Nothing was actually deleted.
			const unit = await Unit.findById(unitId).lean();
			expect(unit?.deleted).toBe(false);
			const property = await Property.findById(propertyId).lean();
			expect(property?.totalUnits).toBe(1);
		});

		it("aborts and rethrows, rolling back, when the commit fails mid-transaction", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({
				userId,
				totalUnits: 2,
			});
			const { unitId } = await seedUnit({ userId, propertyId });
			const { tenantId } = await seedTenant({
				userId,
				propertyId,
				unitId,
			});
			await Unit.findByIdAndUpdate(unitId, {
				$set: {
					status: "Occupied",
					tenant: { tenantId, name: "Rollback Tenant" },
				},
			});

			// Force commitTransaction to reject: the catch aborts + rethrows and
			// every write in the transaction rolls back.
			const boom = new Error("commit failed");
			const realStartSession = mongoose.startSession.bind(mongoose);
			vi.spyOn(mongoose, "startSession").mockImplementation((async (
				...args: unknown[]
			) => {
				const session = await (
					realStartSession as (
						...a: unknown[]
					) => Promise<mongoose.ClientSession>
				)(...args);
				vi.spyOn(session, "commitTransaction").mockRejectedValueOnce(
					boom,
				);
				return session;
			}) as typeof mongoose.startSession);

			await expect(deleteUnit({ id: unitId, userId })).rejects.toBe(boom);

			// Rolled back: unit + tenant still present, count unchanged.
			const unit = await Unit.findById(unitId).lean();
			expect(unit?.deleted).toBe(false);
			const tenant = await Tenant.findById(tenantId).lean();
			expect(tenant?.deleted).toBe(false);
			const property = await Property.findById(propertyId).lean();
			expect(property?.totalUnits).toBe(2);
		});
	});
});
