import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3_BUCKET } from "../../constants";
import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import getS3Instance from "./getS3Instance";

const IN_PROCESS_TTL_MS = 30_000;
const IN_PROCESS_MAX_ENTRIES = 1_000;
type CacheEntry = { url: string; expiresAt: number };
const inProcessCache = new Map<string, CacheEntry>();

function inProcessGet(key: string, now: number): string | null {
	const entry = inProcessCache.get(key);
	if (!entry) return null;
	if (entry.expiresAt <= now) {
		inProcessCache.delete(key);
		return null;
	}
	return entry.url;
}

function inProcessSet(key: string, url: string, now: number): void {
	if (inProcessCache.size >= IN_PROCESS_MAX_ENTRIES) {
		const oldestKey = inProcessCache.keys().next().value;
		if (oldestKey !== undefined) inProcessCache.delete(oldestKey);
	}
	inProcessCache.set(key, { url, expiresAt: now + IN_PROCESS_TTL_MS });
}

/**
 * Retrieves a signed URL for accessing a file from an S3 bucket.
 * If the file is not stored in the S3 bucket, the original file name is returned.
 *
 * Uses a three-layer cache: in-process (30s) → Redis (55min) → S3 presigner.
 *
 * @param fileName - The name of the file to retrieve the signed URL for.
 * @param expiresInSeconds - The expiration time of the signed URL in seconds. Default is 1 hour (3600 seconds).
 * @returns A Promise that resolves to the signed URL or null if an error occurs.
 */
export default async function s3GetFileLink({
	expiresInSeconds = 3_600, // 1 hours
	fileName,
}: {
	fileName: string;
	expiresInSeconds?: number;
}): Promise<string | null> {
	try {
		// Normalize: extract the S3 key whether stored as full URL or bare key
		const uri = fileName.startsWith("https://")
			? fileName.replace("https://", "").split(".s3.amazonaws.com/")[1]
			: fileName;

		const cacheKey = `s3:presigned:${uri}`;
		const now = Date.now();

		const memo = inProcessGet(cacheKey, now);
		if (memo) return memo;

		const cached = await redisRetrieveKeyString<string>(cacheKey);
		if (cached) {
			inProcessSet(cacheKey, cached, now);
			return cached;
		}

		const s3 = getS3Instance();
		const url = await getSignedUrl(
			s3,
			new GetObjectCommand({ Bucket: S3_BUCKET, Key: uri }),
			{ expiresIn: expiresInSeconds },
		);

		// Cache for 55 minutes — 5 min buffer before the 1-hour presigned URL expires
		await redisUpdateKeyString<string>(cacheKey, url, true, 55 * 60);
		inProcessSet(cacheKey, url, now);

		return url;
	} catch (_error) {
		return null;
	}
}
