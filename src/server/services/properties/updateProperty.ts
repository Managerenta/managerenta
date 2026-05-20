import { uploadAndResizeImage } from "../../helpers";
import { updatePropertyDB } from "../../models";
import type { IPropertyUpdateInput } from "../../models/properties/types";
import { invalidateCacheKeys } from "./utils";

export default async function updateProperty({
	id,
	userId,
	payload,
}: {
	id: string;
	userId: string;
	payload: Omit<IPropertyUpdateInput, "image"> & { image?: Buffer };
}): Promise<ReturnType<typeof updatePropertyDB>> {
	const { image, ...rest } = payload;

	let uploadedImage: string | null = null;
	if (image) {
		uploadedImage = await uploadAndResizeImage({
			basePath: "properties/images",
			bufferOrUrl: image,
			shouldResize: true,
		});
	}

	const result = await updatePropertyDB({
		id,
		userId,
		payload: {
			...rest,
			...(uploadedImage ? { image: uploadedImage } : {}),
		},
	});

	if (result) {
		await invalidateCacheKeys({ userId, id });
	}

	return result;
}
