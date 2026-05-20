import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { getOrganizationByNameDB } from "../../models";

export function getQueryKey({ name }: { name: string }): string {
	return `services:getOrganizationByName:${name}`;
}

export default async function getOrganizationByName({
	name,
	refreshCache,
}: {
	name: string;
	refreshCache?: boolean;
}): Promise<ReturnType<typeof getOrganizationByNameDB>> {
	const query = getQueryKey({ name });

	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<
				Awaited<ReturnType<typeof getOrganizationByNameDB>>
			>(query);
		if (cached) return cached;
	}

	const result = await getOrganizationByNameDB({ name });
	if (!result) return null;

	const expiresIn = 60 * 60 * 24; // 24 hours
	await redisUpdateKeyString<typeof result>(query, result, true, expiresIn);
	return result;
}
