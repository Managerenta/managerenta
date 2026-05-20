import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import {
	S3_ACCESS_KEY,
	S3_REGION,
	S3_SECRET_ACCESS_KEY,
} from "../../constants";

/**
 * Returns an instance of the S3Client.
 * @returns {S3Client} The S3Client instance.
 */
export default function getS3Instance(): S3Client {
	const config: S3ClientConfig = {
		credentials: {
			accessKeyId: S3_ACCESS_KEY,
			secretAccessKey: S3_SECRET_ACCESS_KEY,
		},
		region: S3_REGION,
	};
	return new S3Client(config);
}
