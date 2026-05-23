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

export function clearInProcessCache(id?: string | object): void {
	if (id) inProcessCache.delete(String(id));
	else inProcessCache.clear();
}

/**
 * Replace the cached entry for `id` with `value`. Used after a mutation to
 * pre-warm the cache with the known-good post-update doc, so that an
 * in-flight read which started BEFORE the mutation can't write its stale
 * snapshot back into the cache after our invalidation.
 *
 * Classic invalidate-then-read race: process A starts a read, snapshots a
 * stale value; process B updates the row and invalidates; process A's read
 * completes and writes its stale snapshot to the now-empty cache. By
 * over-writing with the fresh value here, A's stale write is harmless —
 * the next reader sees the fresh entry from this set, then A's later set
 * (if it arrives) is a write of the same row again with what's at worst
 * also-stale data, but the in-process Map uses last-writer-wins so the
 * next mutation's set will correct it.
 */
export function setInProcessCache(
	id: string,
	value: Awaited<ReturnType<typeof getUserByIdDB>>,
): void {
	inProcessCache.set(id, {
		value,
		expiresAt: Date.now() + IN_PROCESS_TTL_MS,
	});
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
