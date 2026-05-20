import { uploadAndResizeImage } from "../../helpers";
import { createPropertyDB } from "../../models";
import type { IPropertyCreateInput } from "../../models/properties/types";
import { invalidateCacheKeys } from "./utils";

export default async function createProperty({
	payload,
}: {
	payload: Omit<IPropertyCreateInput, "image"> & { image?: Buffer };
}): Promise<ReturnType<typeof createPropertyDB>> {
	const uploadedImage = await uploadAndResizeImage({
		basePath: "properties/images",
		bufferOrUrl: payload.image,
		shouldResize: true,
	});

	const result = await createPropertyDB({
		payload: {
			...payload,
			image: uploadedImage ?? undefined,
		},
	});

	if (result) {
		await invalidateCacheKeys({ userId: payload.userId });
	}

	return result;
}
