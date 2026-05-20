import { unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	PutObjectCommand,
	type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import { api, createTempDir, fileChecksum, S3_BUCKET } from "../../constants";
import { getS3Instance } from "./";

export default async function uploadFile({
	basePath,
	bufferOrUrl,
	mimeType,
}: {
	bufferOrUrl?: string | Buffer;
	mimeType?: string;
	basePath: string;
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
		// calculate file checksum
		const directory = createTempDir(resolve(__dirname, "../../"));
		const filePath = resolve(directory, uuid());

		writeFileSync(
			filePath,
			new Uint8Array(
				typeof buffer === "string" ? Buffer.from(buffer) : buffer,
			),
		);
		const checksum = `${basePath ? `${basePath}/` : ""}${await fileChecksum(filePath)}`;
		unlinkSync(filePath);

		const params: PutObjectCommandInput = {
			Bucket: S3_BUCKET,
			Body: buffer,
			Key: checksum,
			ContentType: mimeType,
		};

		const command = new PutObjectCommand(params);
		const s3 = getS3Instance();
		await s3.send(command);
		const uri = `https://${S3_BUCKET}.s3.amazonaws.com/${checksum}`;
		return uri;
	} catch (_error) {
		return null;
	}
}
