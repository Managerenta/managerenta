import { ErrTryAgain } from "../../constants";
import { uploadAndResizeImage } from "../../helpers";
import { updateUserDB } from "../../models";
import type { IUserCreateInput } from "../../models/users/types";
import { invalidateCacheKeys } from "./utils";

export default async function updateUser({
	id,
	payload,
}: {
	id: string;
	payload: Partial<Omit<IUserCreateInput, "avatar">> & { avatar?: Buffer };
}): Promise<ReturnType<typeof updateUserDB>> {
	const { avatar, ...bodyPayload } = payload;

	const dataToUpdate: Partial<IUserCreateInput> = { ...bodyPayload };

	if (avatar) {
		const uploadAvatar = await uploadAndResizeImage({
			basePath: "users/avatars",
			bufferOrUrl: avatar,
			shouldResize: true,
		});
		if (!uploadAvatar) throw ErrTryAgain;
		dataToUpdate.avatar = uploadAvatar;
	}

	const result = await updateUserDB({
		id,
		payload: dataToUpdate,
	});
	if (!result) return null;

	await invalidateCacheKeys({ id: String(result._id), email: result.email });
	return result;
}
