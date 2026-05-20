import { redisDeleteKeys } from "../../../databases";
import { getQueryKey as getQueryKeyDashboardStats } from "../getDashboardStats";

export default async function invalidateCacheKeys({
	userId,
}: {
	userId: string;
}): Promise<void> {
	await redisDeleteKeys(getQueryKeyDashboardStats({ userId }));
}
