import mongoose from "mongoose";
import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { s3GetFileLink } from "../../helpers";
import {
	getPropertyStatsDB,
	getTenantStatsDB,
	getUnitStatsDB,
} from "../../models";

export function getQueryKey({ userId }: { userId: string }): string {
	return `services:dashboard:getDashboardStats:${userId}`;
}

type UrgentTenant = {
	tenantId: string;
	name: string;
	avatar?: string;
	propertyName: string;
	unitName: string;
	amount: number;
	phone?: string;
};

type OverdueTenant = UrgentTenant & { overdueDays: number };

type RecentTransaction = {
	_id: string;
	tenantId: string;
	tenantName: string;
	unitName: string;
	date: Date;
	amount: number;
	type: "credit" | "debit";
};

function toObjectIdSafe(id: string): mongoose.Types.ObjectId | null {
	try {
		return new mongoose.Types.ObjectId(id);
	} catch {
		return null;
	}
}

async function getUrgentActions(userId: string): Promise<{
	dueToday: UrgentTenant[];
	overdue: OverdueTenant[];
}> {
	const Tenant = mongoose.models.tenants;
	const Unit = mongoose.models.units;
	const Property = mongoose.models.properties;
	const Transaction = mongoose.models.transactions;

	if (!Tenant || !Unit || !Property || !Transaction) {
		return { dueToday: [], overdue: [] };
	}

	const tenants = await Tenant.find({
		userId,
		deleted: false,
		status: "Active",
	}).lean();
	if (!tenants.length) return { dueToday: [], overdue: [] };

	// Batch fetch related units and properties
	const unitOids = tenants
		.map((t: any) => toObjectIdSafe(t.unitId))
		.filter((x): x is mongoose.Types.ObjectId => x !== null);
	const propertyOids = tenants
		.map((t: any) => toObjectIdSafe(t.propertyId))
		.filter((x): x is mongoose.Types.ObjectId => x !== null);

	const [units, properties, rentCredits] = await Promise.all([
		Unit.find({ _id: { $in: unitOids } }).lean(),
		Property.find({ _id: { $in: propertyOids } }).lean(),
		Transaction.find({ userId, type: "rent", amountType: "credit" }).lean(),
	]);

	const unitMap = new Map<string, any>(
		units.map((u: any) => [u._id.toString(), u]),
	);
	const propertyMap = new Map<string, any>(
		properties.map((p: any) => [p._id.toString(), p]),
	);

	const creditsByTenant = new Map<string, any[]>();
	for (const c of rentCredits as any[]) {
		const list = creditsByTenant.get(c.tenantId) ?? [];
		list.push(c);
		creditsByTenant.set(c.tenantId, list);
	}

	const now = new Date();
	const today = now.getDate();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();

	const dueToday: UrgentTenant[] = [];
	const overdue: OverdueTenant[] = [];

	for (const t of tenants as any[]) {
		const rentDueDay = t.rentDueDay ?? 1;
		const unit = unitMap.get(t.unitId);
		const property = propertyMap.get(t.propertyId);
		if (!unit || !property) continue;

		const monthlyRent: number = unit.rent ?? 0;
		const dueDate = new Date(currentYear, currentMonth, rentDueDay);

		// Check if current month is covered by any rent credit
		const credits = creditsByTenant.get(t._id.toString()) ?? [];
		const covered = credits.some((c) => {
			if (c.periodStart && c.periodEnd) {
				return (
					new Date(c.periodStart) <= dueDate &&
					new Date(c.periodEnd) >= dueDate
				);
			}
			// Legacy: same calendar month
			const txDate = new Date(c.date);
			return (
				txDate.getFullYear() === currentYear &&
				txDate.getMonth() === currentMonth
			);
		});

		if (covered) continue;

		// Accrual-based outstanding rent balance
		const moveIn = new Date(t.moveInDate);
		const monthsElapsed =
			(currentYear - moveIn.getFullYear()) * 12 +
			(currentMonth - moveIn.getMonth()) +
			1;
		const totalAccrued = Math.max(0, monthsElapsed) * monthlyRent;
		const totalRentPaid = credits.reduce(
			(sum: number, c: any) => sum + (c.amount ?? 0),
			0,
		);
		const amount = Math.max(0, totalAccrued - totalRentPaid);
		if (amount === 0) continue;

		const avatar = t.avatar
			? ((await s3GetFileLink({ fileName: t.avatar })) ?? undefined)
			: undefined;

		const base: UrgentTenant = {
			tenantId: t._id.toString(),
			name: t.name,
			avatar,
			propertyName: property.name,
			unitName: unit.name,
			amount,
			phone: t.phone,
		};

		if (today === rentDueDay) {
			dueToday.push(base);
		} else if (today > rentDueDay) {
			const overdueDays = Math.floor(
				(now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
			);
			overdue.push({ ...base, overdueDays });
		}
		// today < rentDueDay → not yet due this month, skip
	}

	return { dueToday, overdue };
}

async function getRecentTransactions(
	userId: string,
): Promise<RecentTransaction[]> {
	const Transaction = mongoose.models.transactions;
	const Tenant = mongoose.models.tenants;
	const Unit = mongoose.models.units;

	if (!Transaction || !Tenant || !Unit) return [];

	const txs = await Transaction.find({ userId, type: "rent" })
		.sort({ date: -1 })
		.limit(5)
		.lean();
	if (!txs.length) return [];

	const tenantOids = (txs as any[])
		.map((t) => toObjectIdSafe(t.tenantId))
		.filter((x): x is mongoose.Types.ObjectId => x !== null);

	const tenants = await Tenant.find({ _id: { $in: tenantOids } }).lean();
	const tenantMap = new Map<string, any>(
		tenants.map((t: any) => [t._id.toString(), t]),
	);

	const unitOids = (tenants as any[])
		.map((t) => toObjectIdSafe(t.unitId))
		.filter((x): x is mongoose.Types.ObjectId => x !== null);

	const units = await Unit.find({ _id: { $in: unitOids } }).lean();
	const unitMap = new Map<string, any>(
		units.map((u: any) => [u._id.toString(), u]),
	);

	return (txs as any[]).map((t) => {
		const tenant = tenantMap.get(t.tenantId);
		const unit = tenant ? unitMap.get(tenant.unitId) : null;
		return {
			_id: t._id.toString(),
			tenantId: t.tenantId,
			tenantName: tenant?.name ?? "",
			unitName: unit?.name ?? "",
			date: t.date,
			amount: t.amount,
			type: t.amountType,
		};
	});
}

export default async function getDashboardStats({
	userId,
	refreshCache,
}: {
	userId: string;
	refreshCache?: boolean;
}) {
	const query = getQueryKey({ userId });

	if (!refreshCache) {
		const cached = await redisRetrieveKeyString<any>(query);
		if (cached) return cached;
	}

	const [
		propertyStats,
		unitStats,
		tenantStats,
		urgentActions,
		recentTransactions,
	] = await Promise.all([
		getPropertyStatsDB({ userId }),
		getUnitStatsDB({ userId }),
		getTenantStatsDB({ userId }),
		getUrgentActions(userId),
		getRecentTransactions(userId),
	]);

	const result = {
		totalProperties: propertyStats.totalProperties,
		totalUnits: propertyStats.totalUnits,
		occupiedUnits: unitStats.occupiedUnits,
		vacantUnits: unitStats.vacantUnits,
		totalMonthlyRevenue: propertyStats.totalMonthlyRent,
		totalTenants: tenantStats.totalTenants,
		urgentActions,
		recentTransactions,
	};

	await redisUpdateKeyString(query, result, true, 2 * 60);
	return result;
}
