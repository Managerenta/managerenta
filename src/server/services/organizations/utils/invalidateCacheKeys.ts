import { redisDeleteKeys } from "../../../databases";
import { getQueryKey as getQueryKeyOrganizationById } from "../getOrganizationById";
import { getQueryKey as getQueryKeyOrganizationByName } from "../getOrganizationByName";
import { getQueryKey as getQueryKeyOrganizationMembers } from "../getOrganizationMembers";
import { getQueryKey as getQueryKeyOrganizations } from "../getOrganizations";
import { getQueryKey as getQueryKeyOrganizationsByIds } from "../getOrganizationsByIds";
import { getQueryKey as getQueryKeyOrganizationsCount } from "../getOrganizationsCount";

export default async function invalidateCacheKeys({
	organizationId,
	name,
}: {
	organizationId?: string;
	name?: string;
}): Promise<void> {
	await redisDeleteKeys(
		...(organizationId
			? [
					getQueryKeyOrganizationById({ organizationId }),
					getQueryKeyOrganizationMembers({ organizationId }),
				]
			: []),
		...(name ? [getQueryKeyOrganizationByName({ name })] : []),
		getQueryKeyOrganizations({
			name: "*",
			offset: "*",
			limit: "*",
			sortBy: "*",
		}),
		getQueryKeyOrganizationsByIds({ ids: "*", offset: "*", limit: "*" }),
		getQueryKeyOrganizationsCount(),
	);
}
