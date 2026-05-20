import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import {
	getPropertiesByIdsDB,
	getTenantStatsDB,
	getTenantsDB,
	getUnitsByIdsDB,
} from "../../models";

type GetTenantsResult = {
	data: any[];
	total: number;
	stats: Awaited<ReturnType<typeof getTenantStatsDB>>;
};

export function getQueryKey({
	userId,
	limit,
	offset,
	status,
	search,
	sort,
}: {
	userId: string;
	limit: string;
	offset: string;
	status: string;
	search: string;
	sort: string;
}): string {
	return `services:tenants:getTenants:${userId}:${limit}:${offset}:${status}:${search}:${sort}`;
}

export default async function getTenants({
	userId,
	limit,
	offset,
	status,
	search,
	sort,
	refreshCache,
}: {
	userId: string;
	limit?: number;
	offset?: number;
	status?: "Active" | "Inactive" | "all";
	search?: string;
	sort?: string;
	refreshCache?: boolean;
}): Promise<GetTenantsResult> {
	const query = getQueryKey({
		userId,
		limit: limit?.toString() ?? "default",
		offset: offset?.toString() ?? "0",
		status: status ?? "all",
		search: search ?? "",
		sort: sort ?? "name",
	});

	if (!refreshCache) {
		const cached = await redisRetrieveKeyString<GetTenantsResult>(query);
		if (cached) return cached;
	}

	const [{ tenants, total }, stats] = await Promise.all([
		getTenantsDB({ userId, limit, offset, status, search, sort }),
		getTenantStatsDB({ userId }),
	]);

	if (tenants.length === 0) {
		const empty: GetTenantsResult = { data: [], total, stats };
		await redisUpdateKeyString<GetTenantsResult>(
			query,
			empty,
			true,
			5 * 60,
		);
		return empty;
	}

	const propertyIds = [...new Set(tenants.map((t) => t.propertyId))];
	const unitIds = [...new Set(tenants.map((t) => t.unitId))];

	const [properties, units] = await Promise.all([
		getPropertiesByIdsDB({ ids: propertyIds }),
		getUnitsByIdsDB({ ids: unitIds }),
	]);

	const propertyById = new Map<string, any>(
		properties.map((p: any) => [p.id ?? String(p._id), p]),
	);
	const unitById = new Map<string, any>(
		units.map((u: any) => [u.id ?? String(u._id), u]),
	);

	const populated = tenants.map((t: any) => {
		const property = propertyById.get(t.propertyId);
		const unit = unitById.get(t.unitId);
		return {
			_id: t._id ?? t.id,
			...t,
			property: property?.name ?? "",
			unit: unit?.name ?? "",
			monthlyRent: unit?.rent ?? 0,
			paymentStatus: unit?.paymentStatus ?? null,
		};
	});

	const result: GetTenantsResult = { data: populated, total, stats };
	await redisUpdateKeyString<GetTenantsResult>(query, result, true, 5 * 60);
	return result;
}
