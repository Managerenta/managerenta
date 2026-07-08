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
import { MaintenanceRequest } from "../../../src/server/models/maintenance";
import { Unit } from "../../../src/server/models/units";
import getAnalytics from "../../../src/server/services/analytics/getAnalytics";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import {
	newId,
	seedProperty,
	seedTenant,
	seedTransaction,
	seedUnit,
} from "../../helpers/seed";

// 15 Jul 2026 midday — July is the last bucket of the monthly series.
const NOW = new Date(2026, 6, 15, 12, 0, 0);

describe("analytics service", () => {
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

	it("computes summary rates, monthly revenue/expense buckets, occupancy and maintenance costs", async () => {
		const userId = newId();
		const { propertyId } = await seedProperty({
			userId,
			name: "Analytics Arms",
			totalUnits: 2,
			monthlyRent: 1800,
		});

		// 1 occupied + 1 vacant unit → 50% occupancy.
		const { unitId: u1 } = await seedUnit({
			userId,
			propertyId,
			name: "AA-1",
			rent: 1200,
		});
		const { tenantId } = await seedTenant({
			userId,
			propertyId,
			unitId: u1,
			name: "Ana Lyst",
			moveInDate: new Date(2026, 4, 1), // May 2026
			rentDueDay: 1,
		});
		await Unit.findByIdAndUpdate(u1, {
			$set: {
				status: "Occupied",
				tenant: { tenantId, name: "Ana Lyst" },
			},
		});
		await seedUnit({ userId, propertyId, name: "AA-2", rent: 600 });

		// Transactions: July credit 2000, July debit 300, June credit 900.
		await seedTransaction({
			userId,
			tenantId,
			amount: 2000,
			date: new Date(2026, 6, 3),
		});
		await seedTransaction({
			userId,
			tenantId,
			type: "maintenance",
			description: "Repairs",
			amount: 300,
			amountType: "debit",
			date: new Date(2026, 6, 5),
		});
		await seedTransaction({
			userId,
			tenantId,
			amount: 900,
			date: new Date(2026, 5, 10),
		});

		// Maintenance costs: plumbing 500 (completed July), electrical 250.
		await MaintenanceRequest.create({
			userId,
			propertyId,
			title: "Burst pipe",
			description: "Pipe burst in AA-1",
			category: "plumbing",
			status: "completed",
			cost: 500,
			completedDate: new Date(2026, 6, 6),
		});
		await MaintenanceRequest.create({
			userId,
			propertyId,
			title: "Rewire socket",
			description: "Socket sparks",
			category: "electrical",
			status: "open",
			cost: 250,
		});

		const analytics = await getAnalytics({ userId, months: 3 });

		expect(analytics.summary).toMatchObject({
			totalProperties: 1,
			totalUnits: 2,
			occupiedUnits: 1,
			vacantUnits: 1,
			occupancyRate: 50,
			totalTenants: 1,
			totalMonthlyRevenue: 1800,
		});

		// monthlyExpected = occupied tenant's unit rent (1200).
		// July credit dated 3 Jul (legacy, no period) counts as collected.
		expect(analytics.summary.monthlyExpected).toBe(1200);
		expect(analytics.summary.monthlyCollected).toBe(2000);
		expect(analytics.summary.collectionRate).toBe(
			Math.round((2000 / 1200) * 100),
		);

		// Monthly buckets now include transaction credits (revenue) and debits
		// (expenses) alongside maintenance-request costs. July revenue = 2000
		// credit; July expenses = 300 (tx debit) + 500 (plumbing, completed
		// Jul) + 250 (electrical, created "now"). June revenue = 900 credit.
		expect(analytics.monthly).toEqual([
			{ month: "May", revenue: 0, expenses: 0 },
			{ month: "Jun", revenue: 900, expenses: 0 },
			{ month: "Jul", revenue: 2000, expenses: 1050 },
		]);

		expect(analytics.occupancyByProperty).toEqual([
			{
				propertyId,
				name: "Analytics Arms",
				occupied: 1,
				total: 2,
				rate: 50,
			},
		]);

		expect(analytics.maintenanceCost).toEqual([
			{ category: "plumbing", total: 500 },
			{ category: "electrical", total: 250 },
		]);
	});

	it("monthly buckets include transaction revenue/debits", async () => {
		const userId = newId();
		const { propertyId } = await seedProperty({ userId });
		const { unitId } = await seedUnit({ userId, propertyId });
		const { tenantId } = await seedTenant({
			userId,
			propertyId,
			unitId,
			moveInDate: new Date(2026, 5, 1),
		});
		await seedTransaction({
			userId,
			tenantId,
			amount: 2000,
			date: new Date(2026, 6, 3),
		});

		const analytics = await getAnalytics({ userId, months: 2 });
		expect(analytics.monthly[1]).toEqual({
			month: "Jul",
			revenue: 2000,
			expenses: 0,
		});
	});

	it("returns zeroed rates for a user with no data", async () => {
		const analytics = await getAnalytics({ userId: newId(), months: 2 });
		expect(analytics.summary.occupancyRate).toBe(0);
		expect(analytics.summary.collectionRate).toBe(0);
		expect(analytics.monthly).toHaveLength(2);
		expect(analytics.occupancyByProperty).toEqual([]);
		expect(analytics.maintenanceCost).toEqual([]);
	});
});
