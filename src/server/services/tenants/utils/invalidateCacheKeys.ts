import { redisDeleteKeys } from "../../../databases";
import { invalidateCacheKeys as invalidateDashboardCacheKeys } from "../../dashboard/utils";
import { getQueryKey as getQueryKeyTenantById } from "../getTenantById";
import { getQueryKey as getQueryKeyTenants } from "../getTenants";

export default async function invalidateCacheKeys({
	userId,
	id,
}: {
	userId: string;
	id?: string;
}): Promise<void> {
	await Promise.all([
		redisDeleteKeys(
			getQueryKeyTenants({
				userId,
				limit: "*",
				offset: "*",
				status: "*",
				search: "*",
				sort: "*",
			}),
			...(id ? [getQueryKeyTenantById({ userId, id })] : []),
		),
		invalidateDashboardCacheKeys({ userId }),
	]);
}
