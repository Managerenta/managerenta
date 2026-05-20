import { compare } from "bcrypt";
import { ErrInvalidCredentials } from "../../constants";
import { changePasswordDB, getUserByIdWithPasswordDB } from "../../models";
import { invalidateCacheKeys } from "./utils";

export default async function changePassword({
	userId,
	currentPassword,
	newPassword,
}: {
	userId: string;
	currentPassword: string;
	newPassword: string;
}): Promise<boolean> {
	const user = await getUserByIdWithPasswordDB({ id: userId });
	if (!user) throw ErrInvalidCredentials;

	const isValid = await compare(currentPassword, user.password);
	if (!isValid) throw ErrInvalidCredentials;

	await invalidateCacheKeys({ id: userId, email: user.email });

	return changePasswordDB({ id: userId, password: newPassword });
}
