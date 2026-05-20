import { removeExpiredUsersTokensDB } from "../../models";

export default async function removeExpiredUsersTokens(): Promise<
	ReturnType<typeof removeExpiredUsersTokensDB>
> {
	const result = await removeExpiredUsersTokensDB();
	return result;
}
