import { redisDeleteKeys } from "../../../databases";
import { getQueryKey as getQueryKeyUserByEmail } from "../getUserByEmail";
import {
	clearInProcessCache as clearUserByIdInProcessCache,
	getQueryKey as getQueryKeyUserById,
} from "../getUserById";
import { getQueryKey as getQueryKeyUsersByEmails } from "../getUsersByEmails";
import { getQueryKey as getQueryKeyUsersByIds } from "../getUsersByIds";

export default async function invalidateCacheKeys({
	id,
	email,
}: {
	id: string;
	email?: string;
}): Promise<void> {
	clearUserByIdInProcessCache(id);
	await redisDeleteKeys(
		...(email ? [getQueryKeyUserByEmail({ email })] : []),
		getQueryKeyUserById({ id }),
		getQueryKeyUsersByEmails({ emails: "*" }),
		getQueryKeyUsersByIds({ ids: "*" }),
	);
}
