import { hash } from "../../constants";
import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { getUsersByIdsDB } from "../../models";

export function getQueryKey({ ids }: { ids: string }): string {
	return `services:users:getUsersByIds:${ids}`;
}

export default async function getUsersByIds({
	ids,
	offset,
	limit,
	refreshCache,
}: {
	ids: string[];
	offset: number;
	limit: number;
	refreshCache?: boolean;
}): Promise<ReturnType<typeof getUsersByIdsDB>> {
	const query = getQueryKey({ ids: hash(ids.join(",")) });

	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<
				Awaited<ReturnType<typeof getUsersByIdsDB>>
			>(query);
		if (cached) return cached;
	}

	const result = await getUsersByIdsDB({ ids, offset, limit });
	if (!result) return [];

	const expiresIn = 60 * 60 * 24; // 24 hours
	await redisUpdateKeyString<typeof result>(query, result, true, expiresIn);
	return result;
}
