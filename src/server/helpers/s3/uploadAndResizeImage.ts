import sharp from "sharp";
import { api, calculateFileNameFromHash } from "../../constants";
import { s3UploadAssetImage } from "./";

export default async function uploadAndResizeImage({
	basePath,
	bufferOrUrl,
	shouldResize,
}: {
	basePath: string;
	bufferOrUrl?: string | Buffer;
	shouldResize: boolean;
}): Promise<string | null> {
	try {
		if (!bufferOrUrl) throw new Error("No image provided");

		let buffer: Buffer | string = bufferOrUrl;

		if (typeof bufferOrUrl === "string") {
			const { data, status } = await api().get(bufferOrUrl, {
				responseType: "arraybuffer",
			});

			if (status !== 200) throw new Error("No image provided");
			buffer = Buffer.from(data, "binary");
		}

		const resizedImage = shouldResize
			? await sharp(buffer).resize(600).webp().toBuffer()
			: await sharp(buffer).webp().toBuffer();

		const contentId =
			`${`${basePath}/`}` +
			(await calculateFileNameFromHash(resizedImage)) +
			".webp";

		const uploadedUrl = await s3UploadAssetImage({
			fileName: contentId,
			data: resizedImage,
			contentType: "image/webp",
		});

		if (!uploadedUrl) throw new Error("Failed to upload image");
		return uploadedUrl;
	} catch (_error) {
		return null;
	}
}
