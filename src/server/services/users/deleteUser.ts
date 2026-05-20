import { deleteUserDB } from "../../models";
import { invalidateCacheKeys } from "./utils";

export default async function deleteUser({
	id,
}: {
	id: string;
}): Promise<ReturnType<typeof deleteUserDB>> {
	const result = await deleteUserDB({ id });
	if (!result) return null;

	await invalidateCacheKeys({ id: result._id, email: result.email });
	return result;
}
