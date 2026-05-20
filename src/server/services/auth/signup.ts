import type { loginUserDB } from "../../models";
import type { IUserCreateInput } from "../../models/users/types";
import { createUser } from "../users";
import login from "./login";

export default async function signup({
	payload,
	ip,
}: {
	payload: Omit<IUserCreateInput, "avatar"> & {
		avatar?: Buffer;
		password: string;
	};
	ip?: string;
}): Promise<ReturnType<typeof loginUserDB>> {
	const user = await createUser({ payload });
	if (!user) return null;

	const result = await login({
		email: user.email,
		password: payload.password,
		ip,
	});
	if (!result) return null;
	return result;
}
