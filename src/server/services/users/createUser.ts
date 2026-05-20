import { uploadAndResizeImage } from "../../helpers";
import { createUserDB } from "../../models";
import type { IUserCreateInput } from "../../models/users/types";
import { invalidateCacheKeys } from "./utils";

export default async function createUser({
	payload,
}: {
	payload: Omit<IUserCreateInput, "avatar"> & { avatar?: Buffer };
}): Promise<ReturnType<typeof createUserDB>> {
	const uploadAvatar = await uploadAndResizeImage({
		basePath: "users/avatars",
		bufferOrUrl: payload.avatar,
		shouldResize: true,
	});
	// if (!uploadAvatar) throw ErrTryAgain;

	const result = await createUserDB({
		payload: {
			...payload,
			avatar: uploadAvatar || undefined,
		},
	});

	if (!result) return null;

	await invalidateCacheKeys({ id: result._id, email: result.email });
	return result;
}
