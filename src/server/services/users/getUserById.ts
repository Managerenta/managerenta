import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { getUserByIdDB } from "../../models";

export function getQueryKey({ id }: { id: string }) {
	return `services:users:getUserById:${id}`;
}

const IN_PROCESS_TTL_MS = 5_000;
type CacheEntry = {
	value: Awaited<ReturnType<typeof getUserByIdDB>>;
	expiresAt: number;
};
const inProcessCache = new Map<string, CacheEntry>();

export function clearInProcessCache(id?: string): void {
	if (id) inProcessCache.delete(id);
	else inProcessCache.clear();
}

export default async function getUserById({
	id,
	refreshCache,
}: {
	id: string;
	refreshCache?: boolean;
}): Promise<ReturnType<typeof getUserByIdDB>> {
	const now = Date.now();

	if (!refreshCache) {
		const memo = inProcessCache.get(id);
		if (memo && memo.expiresAt > now) return memo.value;
	}

	const query = getQueryKey({ id });

	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<
				Awaited<ReturnType<typeof getUserByIdDB>>
			>(query);
		if (cached) {
			inProcessCache.set(id, {
				value: cached,
				expiresAt: now + IN_PROCESS_TTL_MS,
			});
			return cached;
		}
	}

	const result = await getUserByIdDB({ id });
	if (!result) return null;

	const expiresIn = 60 * 60 * 24; // 24 hours
	await redisUpdateKeyString<typeof result>(query, result, true, expiresIn);
	inProcessCache.set(id, {
		value: result,
		expiresAt: Date.now() + IN_PROCESS_TTL_MS,
	});
	return result;
}
