import { logoutUserDB } from "../../models";

export default async function logout({
	userId,
	token,
}: {
	userId: string;
	token: string;
}): Promise<ReturnType<typeof logoutUserDB>> {
	const result = await logoutUserDB({ id: userId, refreshToken: token });
	return result;
}
