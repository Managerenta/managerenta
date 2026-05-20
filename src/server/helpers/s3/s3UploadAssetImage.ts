import { PutObjectCommand } from "@aws-sdk/client-s3";
import { S3_BUCKET } from "../../constants";
import { getS3Instance } from ".";

/**
 * Uploads an asset image to S3.
 *
 * @param fileName - The name of the file.
 * @param data - The image data as a Buffer.
 * @param contentType - The content type of the image (default: "image/webp").
 * @returns A Promise that resolves to the URI of the uploaded image, or null if an error occurs.
 */
export default async function s3UploadAssetImage({
	fileName,
	data,
	contentType = "image/png",
}: {
	fileName: string;
	data: Buffer;
	contentType: string;
}): Promise<string | null> {
	try {
		const params = {
			Bucket: S3_BUCKET,
			Body: data,
			Key: fileName,
			ContentType: contentType,
		};

		const command = new PutObjectCommand(params);
		const s3 = getS3Instance();
		await s3.send(command);
		return fileName;
	} catch (_error) {
		return null;
	}
}
