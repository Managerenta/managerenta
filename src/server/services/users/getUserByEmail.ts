import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import { getUserByEmailDB } from "../../models";

export function getQueryKey({ email }: { email: string }) {
	return `services:users:getUserByEmail:${email}`;
}

export default async function getUserByEmail({
	email,
	refreshCache,
}: {
	email: string;
	refreshCache?: boolean;
}): Promise<ReturnType<typeof getUserByEmailDB>> {
	const query = getQueryKey({ email });

	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<
				Awaited<ReturnType<typeof getUserByEmailDB>>
			>(query);
		if (cached) return cached;
	}

	const result = await getUserByEmailDB({ email });
	if (!result) return null;

	const expiresIn = 60 * 60 * 24; // 24 hours
	await redisUpdateKeyString<typeof result>(query, result, true, expiresIn);
	return result;
}
