import { redisDeleteKeys } from "../../../databases";
import type { IUser } from "../../../models/users/types";
import { getQueryKey as getQueryKeyUserByEmail } from "../getUserByEmail";
import {
	clearInProcessCache as clearUserByIdInProcessCache,
	getQueryKey as getQueryKeyUserById,
	setInProcessCache as setUserByIdInProcessCache,
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
	 * Post-update document to pre-warm the in-process cache with. Closes the
	 * invalidate-then-stale-write race: a concurrent read that started
	 * BEFORE the mutation can otherwise complete AFTER our invalidate and
	 * silently re-populate the cache with the pre-update value. By writing
	 * the known-good post-update doc here, the stale write becomes a no-op
	 * (it just overwrites with another older snapshot of the same row, and
	 * the next read still gets the correct value once it expires or the
	 * next mutation re-warms again).
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
	if (prewarmWith) setUserByIdInProcessCache(id, prewarmWith);
}
