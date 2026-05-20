import { compare } from "bcrypt";
import { ErrInvalidCredentials } from "../../constants";
import { getUserByEmailWithPasswordDB, loginUserDB } from "../../models";

export default async function login({
	email,
	password,
	ip,
}: {
	email: string;
	password: string;
	ip?: string;
}): Promise<ReturnType<typeof loginUserDB>> {
	const user = await getUserByEmailWithPasswordDB({ email });
	if (!user) throw ErrInvalidCredentials;

	const isPasswordValid = await compare(password, user.password);
	if (!isPasswordValid) throw ErrInvalidCredentials;

	const result = await loginUserDB({ id: user._id, ip });
	if (!result) return null;
	return result;
}
