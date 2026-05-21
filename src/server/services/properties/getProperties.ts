import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import {
	getPropertiesDB,
	getPropertyStatsDB,
	getUnitStatsDB,
} from "../../models";

type GetPropertiesResult = {
	data: Awaited<ReturnType<typeof getPropertiesDB>>["properties"];
	total: number;
	stats: {
		totalProperties: number;
		totalUnits: number;
		totalOccupied: number;
		totalMonthlyRent: number;
	};
};

export function getQueryKey({
	userId,
	limit,
	offset,
	search,
	type,
	sort,
}: {
	userId: string;
	limit: string;
	offset: string;
	search: string;
	type: string;
	sort: string;
}): string {
	return `services:properties:getProperties:${userId}:${limit}:${offset}:${search}:${type}:${sort}`;
}

export default async function getProperties({
	userId,
	limit,
	offset,
	search,
	type,
	sort,
	refreshCache,
}: {
	userId: string;
	limit?: number;
	offset?: number;
	search?: string;
	type?: string;
	sort?: "name" | "occupancy" | "revenue" | "units" | "createdAt";
	refreshCache?: boolean;
}): Promise<GetPropertiesResult> {
	const query = getQueryKey({
		userId,
		limit: limit?.toString() ?? "default",
		offset: offset?.toString() ?? "0",
		search: search ?? "",
		type: type ?? "all",
		sort: sort ?? "createdAt",
	});

	if (!refreshCache) {
		const cached = await redisRetrieveKeyString<GetPropertiesResult>(query);
		if (cached) return cached;
	}

	const [{ properties, total }, stats, unitStats] = await Promise.all([
		getPropertiesDB({ userId, limit, offset, search, type, sort }),
		getPropertyStatsDB({ userId }),
		getUnitStatsDB({ userId }),
	]);

	const result: GetPropertiesResult = {
		data: properties,
		total,
		stats: {
			totalProperties: stats.totalProperties,
			totalUnits: stats.totalUnits,
			totalOccupied: unitStats.occupiedUnits,
			totalMonthlyRent: stats.totalMonthlyRent,
		},
	};

	await redisUpdateKeyString<GetPropertiesResult>(
		query,
		result,
		true,
		5 * 60,
	);
	return result;
}
