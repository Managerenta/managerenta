import { hash } from "../../constants";
import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { getOrganizationsByIdsDB } from "../../models";

export function getQueryKey({
	ids,
	offset,
	limit,
}: {
	ids: string;
	offset: string;
	limit: string;
}): string {
	return `services:getOrganizationsByIds:${ids}:${offset}:${limit}`;
}

export default async function getOrganizationsByIds({
	ids,
	offset,
	limit,
	refreshCache,
}: {
	ids: string[];
	offset: number;
	limit: number;
	refreshCache?: boolean;
}): Promise<ReturnType<typeof getOrganizationsByIdsDB>> {
	const query = getQueryKey({
		ids: hash(ids.join(",")),
		offset: offset.toString(),
		limit: limit.toString(),
	});

	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<
				Awaited<ReturnType<typeof getOrganizationsByIdsDB>>
			>(query);
		if (cached) return cached;
	}

	const result = await getOrganizationsByIdsDB({ ids, offset, limit });
	if (!result.length) return [];

	const expiresIn = 60 * 60 * 24; // 24 hours
	await redisUpdateKeyString<typeof result>(query, result, true, expiresIn);
	return result;
}
