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
import getDashboardStats from "../../../src/server/services/dashboard/getDashboardStats";
import { invalidateCacheKeys } from "../../../src/server/services/dashboard/utils";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import {
	newId,
	seedProperty,
	seedTenant,
	seedTransaction,
	seedUnit,
} from "../../helpers/seed";
import { Unit } from "../../../src/server/models/units";

// Freeze "today" so due-day / overdue math is deterministic.
// 15 Jul 2026, midday local time.
const NOW = new Date(2026, 6, 15, 12, 0, 0);

async function seedDashboardScenario() {
	const userId = newId();
	const { propertyId } = await seedProperty({
		userId,
		name: "Dash Estate",
		totalUnits: 3,
		monthlyRent: 1500,
	});

	// U1 occupied by T1 (rent 1000, due day 15 → due today, June covered).
	const { unitId: u1 } = await seedUnit({
		userId,
		propertyId,
		name: "U1",
		rent: 1000,
	});
	const { tenantId: t1 } = await seedTenant({
		userId,
		propertyId,
		unitId: u1,
		name: "Due Today Dana",
		moveInDate: new Date(2026, 5, 15), // 15 Jun 2026 → 2 months accrued
		rentDueDay: 15,
	});
	await Unit.findByIdAndUpdate(u1, {
		$set: {
			status: "Occupied",
			tenant: { tenantId: t1, name: "Due Today Dana" },
		},
	});
	// Legacy credit (no period fields) dated June → covers June only.
	await seedTransaction({
		userId,
		tenantId: t1,
		amount: 1000,
		date: new Date(2026, 5, 20),
	});

	// U2 occupied by T2 (rent 500, due day 1 → 14 days overdue, unpaid).
	const { unitId: u2 } = await seedUnit({
		userId,
		propertyId,
		name: "U2",
		rent: 500,
	});
	const { tenantId: t2 } = await seedTenant({
		userId,
		propertyId,
		unitId: u2,
		name: "Overdue Olu",
		moveInDate: new Date(2026, 6, 1), // 1 Jul 2026 → 1 month accrued
		rentDueDay: 1,
	});
	await Unit.findByIdAndUpdate(u2, {
		$set: {
			status: "Occupied",
			tenant: { tenantId: t2, name: "Overdue Olu" },
		},
	});

	// U3 vacant.
	await seedUnit({ userId, propertyId, name: "U3", rent: 700 });

	return { userId, propertyId, t1, t2 };
}

describe("dashboard service", () => {
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

	it("computes occupancy, revenue and urgent-action numbers exactly", async () => {
		const { userId, t1, t2 } = await seedDashboardScenario();

		const stats = await getDashboardStats({ userId });

		expect(stats.totalProperties).toBe(1);
		expect(stats.totalUnits).toBe(3);
		expect(stats.occupiedUnits).toBe(2);
		expect(stats.vacantUnits).toBe(1);
		expect(stats.totalMonthlyRevenue).toBe(1500);
		expect(stats.totalTenants).toBe(2);

		// Monthly collection: expected = active tenants' unit rents;
		// the only credit is dated June → nothing collected for July.
		expect(stats.monthlyExpected).toBe(1500);
		expect(stats.monthlyCollected).toBe(0);

		// T1: due day 15 == today, accrued 2×1000 − 1000 paid = 1000.
		expect(stats.dueTodayCount).toBe(1);
		expect(stats.urgentActions.dueToday).toHaveLength(1);
		expect(stats.urgentActions.dueToday[0]).toMatchObject({
			tenantId: t1,
			name: "Due Today Dana",
			propertyName: "Dash Estate",
			unitName: "U1",
			amount: 1000,
		});

		// T2: due day 1, unpaid → 14 whole days overdue, amount 500.
		expect(stats.urgentActions.overdue).toHaveLength(1);
		expect(stats.urgentActions.overdue[0]).toMatchObject({
			tenantId: t2,
			name: "Overdue Olu",
			unitName: "U2",
			amount: 500,
			overdueDays: 14,
		});

		// Recent transactions include the June rent credit, enriched with
		// tenant and unit names.
		expect(stats.recentTransactions).toHaveLength(1);
		expect(stats.recentTransactions[0]).toMatchObject({
			tenantId: t1,
			tenantName: "Due Today Dana",
			unitName: "U1",
			amount: 1000,
			type: "credit",
		});
	});

	it("serves the Redis cache on the second call and recomputes after invalidateCacheKeys", async () => {
		const { userId } = await seedDashboardScenario();

		const first = await getDashboardStats({ userId });
		expect(first.totalProperties).toBe(1);

		// Change the world behind the cache's back.
		await seedProperty({ userId, name: "New Block", totalUnits: 10 });

		const cached = await getDashboardStats({ userId });
		expect(cached.totalProperties).toBe(1);
		expect(cached.totalUnits).toBe(3);

		await invalidateCacheKeys({ userId });

		const recomputed = await getDashboardStats({ userId });
		expect(recomputed.totalProperties).toBe(2);
		expect(recomputed.totalUnits).toBe(13);
	});

	it("supports refreshCache to bypass the cache explicitly", async () => {
		const { userId } = await seedDashboardScenario();
		await getDashboardStats({ userId });
		await seedProperty({ userId, name: "Bypass Block", totalUnits: 1 });

		const forced = await getDashboardStats({ userId, refreshCache: true });
		expect(forced.totalProperties).toBe(2);
	});
});
