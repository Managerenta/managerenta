import mongoose from "mongoose";
import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { countActiveIamOperatorsDB } from "../../iam/models";

// Cross-tenant KPIs for the platform operator console. Every figure is computed
// live from the collections (no per-owner scoping) so it must only ever be
// served behind a platform-plane authorize(). Cached briefly to shield the DB
// from dashboard refreshes.

const CACHE_KEY = "services:platform:overview";
const CACHE_TTL_SECONDS = 60;

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

export interface PlatformOverview {
	organizations: number;
	users: number;
	operators: number;
	properties: number;
	units: number;
	occupiedUnits: number;
	vacantUnits: number;
	tenants: number;
	totalRevenue: number;
	monthlyRecurringRevenue: number;
	occupancyRate: number;
	orgGrowth: { month: string; created: number }[];
}

async function count(
	collection: string,
	filter: Record<string, unknown>,
): Promise<number> {
	const model = mongoose.models[collection];
	if (!model) return 0;
	try {
		return await model.countDocuments(filter);
	} catch {
		return 0;
	}
}

async function sumField(
	collection: string,
	filter: Record<string, unknown>,
	field: string,
): Promise<number> {
	const model = mongoose.models[collection];
	if (!model) return 0;
	try {
		const rows = await model.aggregate<{ total: number }>([
			{ $match: filter },
			{ $group: { _id: null, total: { $sum: `$${field}` } } },
		]);
		return Math.round(rows[0]?.total ?? 0);
	} catch {
		return 0;
	}
}

async function getOrgGrowth(
	months: number,
): Promise<{ month: string; created: number }[]> {
	const model = mongoose.models.organizations;
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
	const buckets: { month: string; created: number }[] = [];
	const indexByKey = new Map<string, number>();
	for (let i = 0; i < months; i++) {
		const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
		indexByKey.set(`${d.getFullYear()}-${d.getMonth()}`, buckets.length);
		buckets.push({
			month: MONTH_LABELS[d.getMonth()] as string,
			created: 0,
		});
	}
	if (!model) return buckets;
	try {
		// `.find()` (not `.aggregate()`) avoids the deleted-filter pre-hook so the
		// growth curve counts every org ever created, suspended or not.
		const orgs = (await model
			.find({ createdAt: { $gte: start } }, { createdAt: 1 })
			.lean()) as Array<{ createdAt: Date }>;
		for (const o of orgs) {
			const d = new Date(o.createdAt);
			const idx = indexByKey.get(`${d.getFullYear()}-${d.getMonth()}`);
			if (idx !== undefined && buckets[idx]) buckets[idx].created += 1;
		}
	} catch {
		// fall through with zeroed buckets
	}
	return buckets;
}

export default async function getPlatformOverview({
	refreshCache = false,
}: {
	refreshCache?: boolean;
} = {}): Promise<PlatformOverview> {
	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<PlatformOverview>(CACHE_KEY);
		if (cached) return cached;
	}

	const [
		organizations,
		users,
		operators,
		properties,
		units,
		occupiedUnits,
		tenants,
		totalRevenue,
		monthlyRecurringRevenue,
		orgGrowth,
	] = await Promise.all([
		count("organizations", { deleted: false }),
		count("users", { deleted: false }),
		countActiveIamOperatorsDB(),
		count("properties", { deleted: false }),
		count("units", { deleted: false }),
		count("units", { deleted: false, status: "Occupied" }),
		count("tenants", { deleted: false }),
		sumField("transactions", { amountType: "credit" }, "amount"),
		sumField("units", { deleted: false, status: "Occupied" }, "rent"),
		getOrgGrowth(6),
	]);

	const vacantUnits = Math.max(units - occupiedUnits, 0);
	const occupancyRate = units ? Math.round((occupiedUnits / units) * 100) : 0;

	const result: PlatformOverview = {
		organizations,
		users,
		operators,
		properties,
		units,
		occupiedUnits,
		vacantUnits,
		tenants,
		totalRevenue,
		monthlyRecurringRevenue,
		occupancyRate,
		orgGrowth,
	};

	await redisUpdateKeyString(CACHE_KEY, result, true, CACHE_TTL_SECONDS);
	return result;
}
