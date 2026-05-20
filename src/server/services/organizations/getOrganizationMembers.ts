import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { getOrganizationMembersDB } from "../../models";

export function getQueryKey({
	organizationId,
}: {
	organizationId: string;
}): string {
	return `services:getOrganizationMembers:${organizationId}`;
}

export default async function getOrganizationMembers({
	organizationId,
	refreshCache,
}: {
	organizationId: string;
	refreshCache?: boolean;
}): Promise<ReturnType<typeof getOrganizationMembersDB>> {
	const query = getQueryKey({ organizationId });

	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<
				Awaited<ReturnType<typeof getOrganizationMembersDB>>
			>(query);
		if (cached) return cached;
	}

	const result = await getOrganizationMembersDB({ id: organizationId });
	if (!result) return null;

	const expiresIn = 60 * 60 * 24;
	await redisUpdateKeyString<typeof result>(query, result, true, expiresIn);
	return result;
}
