import { redisDeleteKeys } from "../../../databases";
import { invalidateCacheKeys as invalidateDashboardCacheKeys } from "../../dashboard/utils";
import { getQueryKey as getQueryKeyProperties } from "../getProperties";
import { getQueryKey as getQueryKeyPropertyById } from "../getPropertyById";

export default async function invalidateCacheKeys({
	userId,
	id,
}: {
	userId: string;
	id?: string;
}): Promise<void> {
	await Promise.all([
		redisDeleteKeys(
			getQueryKeyProperties({
				userId,
				limit: "*",
				offset: "*",
				search: "*",
				type: "*",
				sort: "*",
			}),
			...(id ? [getQueryKeyPropertyById({ userId, id })] : []),
		),
		invalidateDashboardCacheKeys({ userId }),
	]);
}
