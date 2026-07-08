import mongoose from "mongoose";
import { Organization } from "../../models";

// Cross-tenant analytics for the operator console. All figures span every owner
// (no userId scoping) — serve only behind a platform-plane authorize().

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

export interface PlatformAnalytics {
	monthly: { month: string; revenue: number; expenses: number }[];
	topOrganizations: { orgId: string; name: string; revenue: number }[];
	occupancy: { occupied: number; vacant: number };
	maintenanceByCategory: { category: string; total: number }[];
}

async function getMonthly(
	months: number,
): Promise<{ month: string; revenue: number; expenses: number }[]> {
	const Transaction = mongoose.models.transactions;
	const Maintenance = mongoose.models.maintenancerequests;
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

	const buckets: { month: string; revenue: number; expenses: number }[] = [];
	const indexByKey = new Map<string, number>();
	for (let i = 0; i < months; i++) {
		const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
		indexByKey.set(`${d.getFullYear()}-${d.getMonth()}`, buckets.length);
		buckets.push({
			month: MONTH_LABELS[d.getMonth()] as string,
			revenue: 0,
			expenses: 0,
		});
	}

	if (Transaction) {
		try {
			const txs = (await Transaction.find({
				date: { $gte: start },
			}).lean()) as Array<{ date: Date; amountType: string; amount?: number }>;
			for (const t of txs) {
				const d = new Date(t.date);
				const idx = indexByKey.get(`${d.getFullYear()}-${d.getMonth()}`);
				if (idx === undefined || !buckets[idx]) continue;
				if (t.amountType === "credit") buckets[idx].revenue += t.amount ?? 0;
				else buckets[idx].expenses += t.amount ?? 0;
			}
		} catch {
			// ignore
		}
	}
	if (Maintenance) {
		try {
			const reqs = (await Maintenance.find({
				deleted: false,
				cost: { $gt: 0 },
				createdAt: { $gte: start },
			}).lean()) as Array<{
				createdAt: Date;
				completedDate?: Date;
				cost?: number;
			}>;
			for (const r of reqs) {
				const d = new Date(r.completedDate ?? r.createdAt);
				const idx = indexByKey.get(`${d.getFullYear()}-${d.getMonth()}`);
				if (idx === undefined || !buckets[idx]) continue;
				buckets[idx].expenses += r.cost ?? 0;
			}
		} catch {
			// ignore
		}
	}

	return buckets.map((b) => ({
		month: b.month,
		revenue: Math.round(b.revenue),
		expenses: Math.round(b.expenses),
	}));
}

async function getTopOrganizations(
	limit: number,
): Promise<{ orgId: string; name: string; revenue: number }[]> {
	const Transaction = mongoose.models.transactions;
	if (!Transaction) return [];
	try {
		const rows = await Transaction.aggregate<{ _id: string; total: number }>([
			{ $match: { amountType: "credit" } },
			{ $group: { _id: "$userId", total: { $sum: "$amount" } } },
		]);
		const revenueByOwner = new Map(
			rows.map((r) => [String(r._id), Math.round(r.total)]),
		);
		// Map owners → orgs. `.find()` avoids the deleted-filter aggregate hook.
		const orgs = (await Organization.find(
			{},
			{ name: 1, ownerId: 1 },
		).lean()) as Array<{
			_id: mongoose.Types.ObjectId;
			name: string;
			ownerId: mongoose.Types.ObjectId;
		}>;
		return orgs
			.map((o) => ({
				orgId: o._id.toString(),
				name: o.name,
				revenue: revenueByOwner.get(o.ownerId.toString()) ?? 0,
			}))
			.filter((o) => o.revenue > 0)
			.sort((a, b) => b.revenue - a.revenue)
			.slice(0, limit);
	} catch {
		return [];
	}
}

async function getOccupancy(): Promise<{ occupied: number; vacant: number }> {
	const Unit = mongoose.models.units;
	if (!Unit) return { occupied: 0, vacant: 0 };
	try {
		const rows = await Unit.aggregate<{ _id: string; count: number }>([
			{ $match: { deleted: false } },
			{ $group: { _id: "$status", count: { $sum: 1 } } },
		]);
		let occupied = 0;
		let vacant = 0;
		for (const r of rows) {
			if (r._id === "Occupied") occupied += r.count;
			else vacant += r.count;
		}
		return { occupied, vacant };
	} catch {
		return { occupied: 0, vacant: 0 };
	}
}

async function getMaintenanceByCategory(): Promise<
	{ category: string; total: number }[]
> {
	const Maintenance = mongoose.models.maintenancerequests;
	if (!Maintenance) return [];
	try {
		const rows = await Maintenance.aggregate<{ _id: string; total: number }>([
			{ $match: { deleted: false, cost: { $gt: 0 } } },
			{ $group: { _id: "$category", total: { $sum: "$cost" } } },
			{ $sort: { total: -1 } },
		]);
		return rows.map((r) => ({
			category: r._id ?? "other",
			total: Math.round(r.total),
		}));
	} catch {
		return [];
	}
}

export default async function getPlatformAnalytics({
	months = 6,
}: {
	months?: number;
} = {}): Promise<PlatformAnalytics> {
	const safeMonths = Math.min(Math.max(months, 3), 12);
	const [monthly, topOrganizations, occupancy, maintenanceByCategory] =
		await Promise.all([
			getMonthly(safeMonths),
			getTopOrganizations(8),
			getOccupancy(),
			getMaintenanceByCategory(),
		]);
	return { monthly, topOrganizations, occupancy, maintenanceByCategory };
}
