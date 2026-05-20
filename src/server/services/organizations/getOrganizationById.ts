import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { getOrganizationByIdDB } from "../../models";

export function getQueryKey({
	organizationId,
}: {
	organizationId: string;
}): string {
	return `services:getOrganizationById:${organizationId}`;
}

export default async function getOrganizationById({
	organizationId,
	refreshCache,
}: {
	organizationId: string;
	refreshCache?: boolean;
}): Promise<ReturnType<typeof getOrganizationByIdDB>> {
	const query = getQueryKey({ organizationId });

	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<
				Awaited<ReturnType<typeof getOrganizationByIdDB>>
			>(query);
		if (cached) return cached;
	}

	const result = await getOrganizationByIdDB({ id: organizationId });
	if (!result) return null;

	const expiresIn = 60 * 60 * 24; // 24 hours
	await redisUpdateKeyString<typeof result>(query, result, true, expiresIn);
	return result;
}
