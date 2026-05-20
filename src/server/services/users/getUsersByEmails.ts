import { hash } from "../../constants";
import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { getUsersByEmailsDB } from "../../models";

export function getQueryKey({ emails }: { emails: string }): string {
	return `services:users:getUsersByEmails:${emails}`;
}

export default async function getUsersByEmails({
	emails,
	offset,
	limit,
	refreshCache,
}: {
	emails: string[];
	offset: number;
	limit: number;
	refreshCache?: boolean;
}): Promise<ReturnType<typeof getUsersByEmailsDB>> {
	const query = getQueryKey({ emails: hash(emails.join(",")) });

	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<
				Awaited<ReturnType<typeof getUsersByEmailsDB>>
			>(query);
		if (cached) return cached;
	}

	const result = await getUsersByEmailsDB({ emails, offset, limit });
	if (!result) return [];

	const expiresIn = 60 * 60 * 24; // 24 hours
	await redisUpdateKeyString<typeof result>(query, result, true, expiresIn);
	return result;
}
