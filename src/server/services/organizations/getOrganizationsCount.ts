import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { getOrganizationsCountDB } from "../../models";

export function getQueryKey(): string {
	return `services:getOrganizationsCount`;
}

export default async function getOrganizationsCount({
	refreshCache,
}: {
	refreshCache?: boolean;
} = {}): Promise<ReturnType<typeof getOrganizationsCountDB>> {
	const query = getQueryKey();

	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<
				Awaited<ReturnType<typeof getOrganizationsCountDB>>
			>(query);
		if (typeof cached === "number") return cached;
	}

	const result = await getOrganizationsCountDB({});
	if (!result) return 0;

	const expiresIn = 60 * 60 * 24; // 24 hours
	await redisUpdateKeyString<typeof result>(query, result, true, expiresIn);
	return result;
}
