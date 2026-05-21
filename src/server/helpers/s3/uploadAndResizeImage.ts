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

		// SECURITY: cap decoded pixel count to defuse decompression-bomb
		// payloads (small file, huge bitmap). 24 MP ≈ 6000×4000, generous
		// for legitimate camera uploads. See SECURITY_REVIEW.md M6.
		const sharpOpts = { limitInputPixels: 24_000_000 } as const;
		const resizedImage = shouldResize
			? await sharp(buffer, sharpOpts).resize(600).webp().toBuffer()
			: await sharp(buffer, sharpOpts).webp().toBuffer();

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
