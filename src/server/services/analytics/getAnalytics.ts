import mongoose from "mongoose";
import getDashboardStats from "../dashboard/getDashboardStats";

const MONTH_LABELS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

type MonthPoint = { month: string; revenue: number; expenses: number };
type OccupancyRow = {
	propertyId: string;
	name: string;
	occupied: number;
	total: number;
	rate: number;
};

/**
 * Revenue (rent credits) and expenses (maintenance cost / debits) for the last
 * `months` calendar months, attributed by transaction date.
 */
async function getMonthlySeries(
	userId: string,
	months: number,
): Promise<MonthPoint[]> {
	const Transaction = mongoose.models.transactions;
	const Maintenance = mongoose.models.maintenancerequests;

	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

	const buckets: MonthPoint[] = [];
	const indexByKey = new Map<string, number>();
	for (let i = 0; i < months; i++) {
		const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
		const key = `${d.getFullYear()}-${d.getMonth()}`;
		indexByKey.set(key, buckets.length);
		buckets.push({
			month: MONTH_LABELS[d.getMonth()],
			revenue: 0,
			expenses: 0,
		});
	}

	if (Transaction) {
		// Transactions are hard-deleted (no `deleted` field). A `deleted: false`
		// filter matches ZERO docs here, silently zeroing revenue/expenses.
		const txs = (await Transaction.find({
			userId,
			date: { $gte: start },
		}).lean()) as any[];
		for (const t of txs) {
			const d = new Date(t.date);
			const key = `${d.getFullYear()}-${d.getMonth()}`;
			const idx = indexByKey.get(key);
			if (idx === undefined) continue;
			if (t.amountType === "credit") {
				buckets[idx].revenue += t.amount ?? 0;
			} else {
				buckets[idx].expenses += t.amount ?? 0;
			}
		}
	}

	if (Maintenance) {
		const reqs = (await Maintenance.find({
			userId,
			deleted: false,
			cost: { $gt: 0 },
			createdAt: { $gte: start },
		}).lean()) as any[];
		for (const r of reqs) {
			const d = new Date(r.completedDate ?? r.createdAt);
			const key = `${d.getFullYear()}-${d.getMonth()}`;
			const idx = indexByKey.get(key);
			if (idx === undefined) continue;
			buckets[idx].expenses += r.cost ?? 0;
		}
	}

	return buckets.map((b) => ({
		...b,
		revenue: Math.round(b.revenue),
		expenses: Math.round(b.expenses),
	}));
}

async function getOccupancyByProperty(userId: string): Promise<OccupancyRow[]> {
	const Unit = mongoose.models.units;
	const Property = mongoose.models.properties;
	if (!Unit || !Property) return [];

	const properties = (await Property.find({
		userId,
		deleted: false,
	}).lean()) as any[];
	if (!properties.length) return [];

	const units = (await Unit.find({ userId, deleted: false }).lean()) as any[];
	const byProperty = new Map<string, { occupied: number; total: number }>();
	for (const u of units) {
		const entry = byProperty.get(u.propertyId) ?? { occupied: 0, total: 0 };
		entry.total += 1;
		if (u.status === "Occupied") entry.occupied += 1;
		byProperty.set(u.propertyId, entry);
	}

	return properties
		.map((p) => {
			const stat = byProperty.get(p._id.toString()) ?? {
				occupied: 0,
				total: 0,
			};
			return {
				propertyId: p._id.toString(),
				name: p.name as string,
				occupied: stat.occupied,
				total: stat.total,
				rate: stat.total
					? Math.round((stat.occupied / stat.total) * 100)
					: 0,
			};
		})
		.sort((a, b) => b.total - a.total)
		.slice(0, 8);
}

async function getMaintenanceCostByCategory(
	userId: string,
): Promise<{ category: string; total: number }[]> {
	const Maintenance = mongoose.models.maintenancerequests;
	if (!Maintenance) return [];
	const rows = await Maintenance.aggregate<{ _id: string; total: number }>([
		{ $match: { userId, deleted: false, cost: { $gt: 0 } } },
		{ $group: { _id: "$category", total: { $sum: "$cost" } } },
		{ $sort: { total: -1 } },
	]);
	return rows.map((r) => ({ category: r._id, total: Math.round(r.total) }));
}

export default async function getAnalytics({
	userId,
	months = 6,
}: {
	userId: string;
	months?: number;
}) {
	const [dashboard, monthly, occupancyByProperty, maintenanceCost] =
		await Promise.all([
			getDashboardStats({ userId }),
			getMonthlySeries(userId, months),
			getOccupancyByProperty(userId),
			getMaintenanceCostByCategory(userId),
		]);

	const occupancyRate = dashboard.totalUnits
		? Math.round((dashboard.occupiedUnits / dashboard.totalUnits) * 100)
		: 0;
	const collectionRate = dashboard.monthlyExpected
		? Math.round(
				(dashboard.monthlyCollected / dashboard.monthlyExpected) * 100,
			)
		: 0;

	return {
		summary: {
			totalProperties: dashboard.totalProperties,
			totalUnits: dashboard.totalUnits,
			occupiedUnits: dashboard.occupiedUnits,
			vacantUnits: dashboard.vacantUnits,
			occupancyRate,
			totalTenants: dashboard.totalTenants,
			totalMonthlyRevenue: dashboard.totalMonthlyRevenue,
			monthlyCollected: dashboard.monthlyCollected,
			monthlyExpected: dashboard.monthlyExpected,
			collectionRate,
		},
		monthly,
		occupancyByProperty,
		maintenanceCost,
	};
}
