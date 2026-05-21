import { loginUserDB } from "../../models";
import type { IUserCreateInput } from "../../models/users/types";
import { createUser } from "../users";

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
	if (!user?._id) return null;

	// Issue the session directly. New accounts never have 2FA enabled, so
	// routing through `login()` would just force TypeScript to unwrap a
	// branch that can never fire here.
	return loginUserDB({ id: user._id.toString(), ip });
}
