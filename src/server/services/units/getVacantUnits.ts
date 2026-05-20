import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { getVacantUnitsDB } from "../../models";

type GetVacantUnitsResult = Awaited<ReturnType<typeof getVacantUnitsDB>>;

export function getQueryKey({
	userId,
	status,
	limit,
}: {
	userId: string;
	status: string;
	limit: string;
}): string {
	return `services:units:getVacantUnits:${userId}:${status}:${limit}`;
}

export default async function getVacantUnits({
	userId,
	status,
	limit,
	refreshCache,
}: {
	userId: string;
	status?: "Vacant" | "Occupied";
	limit?: number;
	refreshCache?: boolean;
}): Promise<GetVacantUnitsResult> {
	const query = getQueryKey({
		userId,
		status: status ?? "all",
		limit: limit?.toString() ?? "default",
	});

	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<GetVacantUnitsResult>(query);
		if (cached) return cached;
	}

	const result = await getVacantUnitsDB({ userId, status, limit });
	await redisUpdateKeyString<GetVacantUnitsResult>(
		query,
		result,
		true,
		5 * 60,
	);
	return result;
}
