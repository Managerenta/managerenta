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
// IMPORTANT: load `constants` before any direct model import. The src module
// graph is circular (models → helpers → constants → cron → services →
// models); entering it via a bare model module leaves the models barrel with
// a partially-populated namespace (getTransactionsByTenantIdDB undefined).
import "../../../src/server/constants";
import { Tenant } from "../../../src/server/models/tenants";
import getTenantById from "../../../src/server/services/tenants/getTenantById";
import getTenants from "../../../src/server/services/tenants/getTenants";
import { invalidateCacheKeys } from "../../../src/server/services/tenants/utils";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import {
	newId,
	seedProperty,
	seedTenant,
	seedTransaction,
	seedUnit,
} from "../../helpers/seed";

// 15 Jul 2026 midday: fixed so due-date / overdue / paymentHistory math is
// deterministic.
const NOW = new Date(2026, 6, 15, 12, 0, 0);

describe("tenant read models (getTenants / getTenantById)", () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	beforeEach(async () => {
		await clearTestDB();
		vi.useFakeTimers({ toFake: ["Date"], now: NOW });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	afterAll(async () => {
		await clearTestDB();
	});

	describe("getTenants", () => {
		async function seedThree(userId: string) {
			const { propertyId } = await seedProperty({
				userId,
				name: "Reader Estate",
			});
			const { unitId: u1 } = await seedUnit({
				userId,
				propertyId,
				name: "R1",
				rent: 800,
			});
			const { unitId: u2 } = await seedUnit({
				userId,
				propertyId,
				name: "R2",
				rent: 950,
			});
			const { unitId: u3 } = await seedUnit({
				userId,
				propertyId,
				name: "R3",
				rent: 500,
			});
			await seedTenant({
				userId,
				propertyId,
				unitId: u1,
				name: "Alice Active",
			});
			await seedTenant({
				userId,
				propertyId,
				unitId: u2,
				name: "Bob Busy",
			});
			await seedTenant({
				userId,
				propertyId,
				unitId: u3,
				name: "Ida Inactive",
				status: "Inactive",
			});
			return { propertyId };
		}

		it("returns tenants populated with property/unit/rent, plus stats", async () => {
			const userId = newId();
			await seedThree(userId);

			const result = await getTenants({ userId, status: "all" });

			expect(result.total).toBe(3);
			expect(result.stats.totalTenants).toBe(3);
			expect(result.stats.activeTenants).toBe(2);

			const alice = result.data.find(
				(t: { name: string }) => t.name === "Alice Active",
			);
			expect(alice).toMatchObject({
				property: "Reader Estate",
				unit: "R1",
				monthlyRent: 800,
			});
		});

		it("filters by status and by search", async () => {
			const userId = newId();
			await seedThree(userId);

			const active = await getTenants({ userId, status: "Active" });
			expect(active.total).toBe(2);
			expect(
				active.data.every(
					(t: { status: string }) => t.status === "Active",
				),
			).toBe(true);

			const searched = await getTenants({
				userId,
				status: "all",
				search: "bob",
			});
			expect(searched.total).toBe(1);
			expect(searched.data[0].name).toBe("Bob Busy");
		});

		it("caches results and recomputes after invalidateCacheKeys", async () => {
			const userId = newId();
			const { propertyId } = await seedThree(userId);

			const first = await getTenants({ userId });
			expect(first.total).toBe(3);

			// Direct model insert bypasses invalidation → stale cache.
			const { unitId } = await seedUnit({
				userId,
				propertyId,
				name: "R4",
			});
			await seedTenant({
				userId,
				propertyId,
				unitId,
				name: "Newcomer Ned",
			});
			const cached = await getTenants({ userId });
			expect(cached.total).toBe(3);

			await invalidateCacheKeys({ userId });
			const fresh = await getTenants({ userId });
			expect(fresh.total).toBe(4);
		});

		it("caches the empty result for a user with no tenants", async () => {
			const userId = newId();
			const empty = await getTenants({ userId });
			expect(empty).toMatchObject({ data: [], total: 0 });
			const again = await getTenants({ userId });
			expect(again.data).toEqual([]);
		});
	});

	describe("getTenantById", () => {
		async function seedDetailScenario() {
			const userId = newId();
			const { propertyId } = await seedProperty({
				userId,
				name: "Detail Court",
			});
			const { unitId } = await seedUnit({
				userId,
				propertyId,
				name: "D-7",
				rent: 1000,
			});
			const { tenantId } = await seedTenant({
				userId,
				propertyId,
				unitId,
				name: "Detail Dan",
				moveInDate: new Date(2026, 4, 1), // 1 May 2026 → 3 months accrued
				leaseExpiry: new Date(2027, 4, 1),
				rentDueDay: 10,
			});
			return { userId, propertyId, unitId, tenantId };
		}

		it("aggregates unit/property, balances, next due date and payment stats", async () => {
			const { userId, tenantId } = await seedDetailScenario();

			// Rent credit paid on time for May (due 10 May, paid 10 May).
			await seedTransaction({
				userId,
				tenantId,
				amount: 1000,
				date: new Date(2026, 4, 10),
				periodStart: new Date(2026, 4, 10),
				periodEnd: new Date(2026, 5, 9),
			});
			// A maintenance debit for running balance / recent activity.
			await seedTransaction({
				userId,
				tenantId,
				type: "maintenance",
				description: "Broken window",
				amount: 150,
				amountType: "debit",
				date: new Date(2026, 5, 2),
			});

			const result = await getTenantById({ id: tenantId, userId });

			expect(result).not.toBeNull();
			expect(result.name).toBe("Detail Dan");
			expect(result.property).toBe("Detail Court");
			expect(result.unit).toBe("D-7");
			expect(result.monthlyRent).toBe(1000);
			expect(result.rentDueDay).toBe(10);

			// Accrued: May+Jun+Jul = 3 × 1000; paid 1000 → 2000 outstanding.
			expect(result.paymentStats.outstandingBalance).toBe(2000);
			expect(result.paymentStats.totalPaidThisYear).toBe(1000);
			// Paid exactly on the due day → zero delay, perfect score.
			expect(result.paymentStats.avgPaymentDelay).toBe(0);
			expect(result.paymentStats.reliabilityScore).toBe(100);

			// Last covered period ended 9 Jun (in the past) → next due is
			// the current month's due day; 10 Jul already passed vs NOW
			// (15 Jul) → pushed to 10 Aug.
			expect(new Date(result.nextDueDate)).toEqual(
				new Date(2026, 7, 10),
			);

			// Overdue: 15 Jul > 10 Jul with money owing → 5 days.
			expect(result.overdueStatus).toBe(true);
			expect(result.overdueDays).toBe(5);

			expect(result.lastPaymentAmount).toBe(1000);

			// Transactions ordered newest-first with running balance:
			// oldest→newest: credit 1000 → -1000, debit 150 → -850.
			expect(
				result.transactions.map(
					(t: { runningBalance: number }) => t.runningBalance,
				),
			).toEqual([-850, -1000]);

			// 12-block payment history: 6 past + 6 upcoming (current month
			// upcoming). May was covered by the period → paid; June not.
			expect(result.paymentHistory).toHaveLength(12);
			const byMonth = Object.fromEntries(
				result.paymentHistory.map(
					(p: { _id: string; status: string }) => [p._id, p.status],
				),
			);
			expect(byMonth["ph-2026-05"]).toBe("paid");
			expect(byMonth["ph-2026-06"]).toBe("overdue");
			expect(byMonth["ph-2026-07"]).toBe("upcoming");

			// Recent activity labels derive from type/amountType.
			expect(
				result.recentActivity.map((a: { label: string }) => a.label),
			).toEqual(["Broken window", "Rent Payment Received"]);

			expect(result.tenancyDuration).toBe("1 year");
		});

		it("advance payments push nextDueDate past the covered window", async () => {
			const { userId, tenantId } = await seedDetailScenario();
			// Pay 3 months ahead: covers through 30 Sep 2026.
			await seedTransaction({
				userId,
				tenantId,
				amount: 3000,
				date: new Date(2026, 6, 10),
				period: 3,
				periodStart: new Date(2026, 6, 10),
				periodEnd: new Date(2026, 8, 30),
			});

			const result = await getTenantById({ id: tenantId, userId });
			// Next due: rentDueDay of the month after the covered window.
			expect(new Date(result.nextDueDate)).toEqual(
				new Date(2026, 9, 10),
			);
			expect(result.paymentStats.outstandingBalance).toBe(0);
			expect(result.overdueStatus).toBe(false);
		});

		it("serves the cache until invalidated", async () => {
			const { userId, tenantId } = await seedDetailScenario();

			const first = await getTenantById({ id: tenantId, userId });
			expect(first.name).toBe("Detail Dan");

			await Tenant.findByIdAndUpdate(tenantId, {
				$set: { name: "Renamed Dan" },
			});
			const cached = await getTenantById({ id: tenantId, userId });
			expect(cached.name).toBe("Detail Dan");

			await invalidateCacheKeys({ userId, id: tenantId });
			const fresh = await getTenantById({ id: tenantId, userId });
			expect(fresh.name).toBe("Renamed Dan");
		});

		it("formats tenancy duration across the month-borrow and days branches", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({ userId, propertyId });
			// moveIn 15 Mar 2026 → lease 10 Jan 2027: day borrow makes months go
			// negative, forcing the `months < 0` correction (years-=1, months+=12)
			// and, with years landing on 0, the trailing days component.
			const { tenantId } = await seedTenant({
				userId,
				propertyId,
				unitId,
				moveInDate: new Date(2026, 2, 15),
				leaseExpiry: new Date(2027, 0, 10),
			});

			const result = await getTenantById({ id: tenantId, userId });
			expect(result.tenancyDuration).toBe("9 months, 26 days");
		});

		it("returns null for a foreign or missing tenant", async () => {
			const { tenantId } = await seedDetailScenario();
			expect(
				await getTenantById({ id: tenantId, userId: newId() }),
			).toBeNull();
			expect(
				await getTenantById({ id: newId(), userId: newId() }),
			).toBeNull();
		});
	});
});
