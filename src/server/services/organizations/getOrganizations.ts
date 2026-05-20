import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { getOrganizationsDB } from "../../models";

export function getQueryKey({
	name,
	offset,
	limit,
	sortBy,
}: {
	name?: string;
	offset: string;
	limit: string;
	sortBy?: string;
}): string {
	return `services:getOrganizations:${name}:${offset}:${limit}:${sortBy}`;
}

export default async function getOrganizations({
	name,
	offset,
	limit,
	sortBy,
	refreshCache,
}: {
	name?: string;
	offset: number;
	limit: number;
	sortBy?: "asc" | "desc";
	refreshCache?: boolean;
}): Promise<ReturnType<typeof getOrganizationsDB>> {
	const query = getQueryKey({
		name,
		offset: offset.toString(),
		limit: limit.toString(),
		sortBy,
	});

	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<
				Awaited<ReturnType<typeof getOrganizationsDB>>
			>(query);
		if (cached) return cached;
	}

	const result = await getOrganizationsDB({ name, offset, limit, sortBy });
	if (!result) return [];

	const expiresIn = 60 * 60 * 24; // 24 hours
	await redisUpdateKeyString<typeof result>(query, result, true, expiresIn);
	return result;
}
