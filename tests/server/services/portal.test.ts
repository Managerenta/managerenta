import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MaintenanceRequest } from "../../../src/server/models/maintenance";
import {
	getPortalSummary,
	submitPortalMaintenance,
} from "../../../src/server/services/portal";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import {
	newId,
	seedProperty,
	seedTenant,
	seedTransaction,
	seedUnit,
} from "../../helpers/seed";

async function seedPortalScenario({
	rent = 1000,
	tenantOverrides = {} as Record<string, unknown>,
} = {}) {
	const ownerId = newId();
	const { propertyId } = await seedProperty({
		userId: ownerId,
		name: "Portal Court",
		address: "7 Portal Way",
	});
	const { unitId } = await seedUnit({
		userId: ownerId,
		propertyId,
		name: "P-1",
		rent,
	});
	// Move-in three calendar months ago on the 5th → monthsElapsed = 4
	// (3 whole month transitions + the current month).
	const now = new Date();
	const moveInDate = new Date(now.getFullYear(), now.getMonth() - 3, 5);
	const { tenantId } = await seedTenant({
		userId: ownerId,
		propertyId,
		unitId,
		name: "Portia Portal",
		moveInDate,
		rentDueDay: 5,
		...tenantOverrides,
	});
	return { ownerId, propertyId, unitId, tenantId, moveInDate };
}

describe("portal service", () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	beforeEach(async () => {
		await clearTestDB();
	});

	afterAll(async () => {
		await clearTestDB();
	});

	describe("getPortalSummary", () => {
		// getPortalSummary returns the tenant's own transactions (hard-deleted
		// collection, no `deleted` field — the query must NOT filter on it).
		it("returns the tenant's transactions and computes totalPaid from rent credits", async () => {
			const { ownerId, tenantId, propertyId, unitId } =
				await seedPortalScenario({ rent: 1000 });

			// 1500 of rent credits + one utilities credit.
			await seedTransaction({ userId: ownerId, tenantId, amount: 1000 });
			await seedTransaction({ userId: ownerId, tenantId, amount: 500 });
			await seedTransaction({
				userId: ownerId,
				tenantId,
				type: "utilities",
				description: "Water",
				amount: 200,
			});

			const summary = await getPortalSummary({ tenantId, ownerId });

			expect(summary).not.toBeNull();
			expect(summary?.tenant).toMatchObject({
				id: tenantId,
				name: "Portia Portal",
				rentDueDay: 5,
			});
			expect(summary?.property).toMatchObject({
				id: propertyId,
				name: "Portal Court",
				address: "7 Portal Way",
			});
			expect(summary?.unit).toMatchObject({
				id: unitId,
				name: "P-1",
				rent: 1000,
			});
			// All three transactions are visible; totalPaid counts only rent
			// credits (utilities excluded); outstanding = 4×1000 − 1500.
			expect(summary?.transactions).toHaveLength(3);
			expect(summary?.balance).toEqual({
				outstanding: 2500,
				totalPaid: 1500,
				monthlyRent: 1000,
			});
		});

		it("outstanding = monthsElapsed × rent − rent credits", async () => {
			const { ownerId, tenantId } = await seedPortalScenario({
				rent: 1000,
			});
			await seedTransaction({ userId: ownerId, tenantId, amount: 1000 });
			await seedTransaction({ userId: ownerId, tenantId, amount: 500 });

			const summary = await getPortalSummary({ tenantId, ownerId });
			// 4 months × 1000 − 1500 rent credits = 2500
			expect(summary?.balance).toEqual({
				outstanding: 2500,
				totalPaid: 1500,
				monthlyRent: 1000,
			});
		});

		it("transactions capped at 50 newest-first", async () => {
			const { ownerId, tenantId } = await seedPortalScenario();
			const base = Date.now() - 60 * 24 * 3600 * 1000;
			for (let i = 0; i < 55; i++) {
				await seedTransaction({
					userId: ownerId,
					tenantId,
					amount: 10,
					date: new Date(base + i * 3600 * 1000),
					description: `tx-${i}`,
				});
			}

			const summary = await getPortalSummary({ tenantId, ownerId });
			expect(summary?.transactions).toHaveLength(50);
			expect(summary?.transactions[0].description).toBe("tx-54");
		});

		it("floors the outstanding balance at zero when rent is zero or months negative", async () => {
			// The floor-at-zero branch is only reachable through totalPaid
			// while the bug above stands, so exercise the other guard: a
			// tenant whose moveInDate is in the future must not owe anything.
			const ownerId = newId();
			const { propertyId } = await seedProperty({ userId: ownerId });
			const { unitId } = await seedUnit({
				userId: ownerId,
				propertyId,
				rent: 1000,
			});
			const now = new Date();
			const { tenantId } = await seedTenant({
				userId: ownerId,
				propertyId,
				unitId,
				moveInDate: new Date(now.getFullYear(), now.getMonth() + 3, 1),
			});

			const summary = await getPortalSummary({ tenantId, ownerId });
			expect(summary?.balance.outstanding).toBe(0);
		});

		it("returns null for the wrong ownerId", async () => {
			const { tenantId } = await seedPortalScenario();
			expect(
				await getPortalSummary({ tenantId, ownerId: newId() }),
			).toBeNull();
		});

		it("returns null for a soft-deleted tenant", async () => {
			const { ownerId, tenantId } = await seedPortalScenario({
				tenantOverrides: { deleted: true },
			});
			expect(await getPortalSummary({ tenantId, ownerId })).toBeNull();
		});

		it("returns null for an Inactive tenant (stale portal token must stop serving data)", async () => {
			const { ownerId, tenantId } = await seedPortalScenario({
				tenantOverrides: { status: "Inactive" },
			});
			expect(await getPortalSummary({ tenantId, ownerId })).toBeNull();
		});

		it("returns null for a malformed tenant id", async () => {
			expect(
				await getPortalSummary({
					tenantId: "not-an-object-id",
					ownerId: newId(),
				}),
			).toBeNull();
		});
	});

	describe("submitPortalMaintenance", () => {
		it("creates a request bound to the tenant's own property and unit", async () => {
			const { ownerId, tenantId, propertyId, unitId } =
				await seedPortalScenario();

			const request = await submitPortalMaintenance({
				tenantId,
				ownerId,
				title: "Leaky tap",
				description: "Kitchen tap drips all night",
				category: "plumbing",
			});

			expect(request).not.toBeNull();
			expect(request?.propertyId).toBe(propertyId);
			expect(request?.unitId).toBe(unitId);
			expect(request?.tenantId).toBe(tenantId);
			expect(request?.userId).toBe(ownerId);
			expect(request?.status).toBe("open");

			const stored = await MaintenanceRequest.findById(
				request?.id,
			).lean();
			expect(stored?.title).toBe("Leaky tap");
		});

		it("rejects an Inactive tenant with null", async () => {
			const { ownerId, tenantId } = await seedPortalScenario({
				tenantOverrides: { status: "Inactive" },
			});
			expect(
				await submitPortalMaintenance({
					tenantId,
					ownerId,
					title: "Nope",
					description: "Should not exist",
					category: "other",
				}),
			).toBeNull();
			expect(await MaintenanceRequest.countDocuments({})).toBe(0);
		});

		it("rejects a tenant/owner mismatch with null", async () => {
			const { tenantId } = await seedPortalScenario();
			expect(
				await submitPortalMaintenance({
					tenantId,
					ownerId: newId(),
					title: "Nope",
					description: "Wrong owner",
					category: "other",
				}),
			).toBeNull();
		});
	});
});
