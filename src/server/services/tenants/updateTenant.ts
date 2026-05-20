import { uploadAndResizeImage } from "../../helpers";
import { updateTenantDB } from "../../models";
import { invalidateCacheKeys } from "./utils";

export default async function updateTenant({
	id,
	userId,
	payload,
}: {
	id: string;
	userId: string;
	payload: {
		name?: string;
		phone?: string;
		email?: string;
		moveInDate?: Date;
		leaseExpiry?: Date;
		rentDueDay?: number;
		avatar?: Buffer;
	};
}) {
	const { avatar, ...rest } = payload;

	let uploadedAvatar: string | undefined;
	if (avatar) {
		uploadedAvatar =
			(await uploadAndResizeImage({
				basePath: "tenants/avatars",
				bufferOrUrl: avatar,
				shouldResize: true,
			})) ?? undefined;
	}

	const result = await updateTenantDB({
		id,
		userId,
		payload: {
			...rest,
			...(uploadedAvatar ? { avatar: uploadedAvatar } : {}),
		},
	});

	if (result) {
		await invalidateCacheKeys({ userId, id });
	}

	return result;
}
