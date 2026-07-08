import {
	redisDeleteKeys,
	redisUpdateKeyString,
} from "../../../databases";
import type { IUser } from "../../../models/users/types";
import { getQueryKey as getQueryKeyUserByEmail } from "../getUserByEmail";
import {
	clearInProcessCache as clearUserByIdInProcessCache,
	getQueryKey as getQueryKeyUserById,
	setInProcessCache as setUserByIdInProcessCache,
	USER_BY_ID_CACHE_TTL_SECONDS,
} from "../getUserById";
import { getQueryKey as getQueryKeyUsersByEmails } from "../getUsersByEmails";
import { getQueryKey as getQueryKeyUsersByIds } from "../getUsersByIds";

export default async function invalidateCacheKeys({
	id,
	email,
	prewarmWith,
}: {
	id: string;
	email?: string;
	/**
	 * Post-update document to pre-warm the cache with. Closes the
	 * invalidate-then-stale-write race: a concurrent read that started BEFORE
	 * the mutation can otherwise complete AFTER our invalidate and silently
	 * re-populate the cache with the pre-update value. By writing the
	 * known-good post-update doc into BOTH cache layers here, the common case
	 * is immediately correct; the bounded Redis TTL caps any residual
	 * staleness from a slow racing reader that still lands after this.
	 */
	prewarmWith?: IUser;
}): Promise<void> {
	clearUserByIdInProcessCache(id);
	await redisDeleteKeys(
		...(email ? [getQueryKeyUserByEmail({ email })] : []),
		getQueryKeyUserById({ id }),
		getQueryKeyUsersByEmails({ emails: "*" }),
		getQueryKeyUsersByIds({ ids: "*" }),
	);
	if (prewarmWith) {
		setUserByIdInProcessCache(id, prewarmWith);
		// Prewarm the Redis layer too — the in-process map is per-process and
		// 5s-lived, so without this the shared 24h→bounded Redis entry would
		// keep serving the pre-update snapshot after the map expires.
		await redisUpdateKeyString(
			getQueryKeyUserById({ id }),
			prewarmWith,
			true,
			USER_BY_ID_CACHE_TTL_SECONDS,
		);
	}
}
