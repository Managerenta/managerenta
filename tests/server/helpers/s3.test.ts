import { createHash } from "node:crypto";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redisRetrieveKeyString } from "../../../src/server/databases";

// ── Mock the true externals: the S3 client and the URL presigner ──────────
const sendMock = vi.hoisted(() => vi.fn(async (_command?: any) => ({})));
let presignCounter = 0;
const getSignedUrlMock = vi.hoisted(() =>
	vi.fn(
		async (
			_client: unknown,
			command: { input: { Key: string } & Record<string, any> },
		) => {
			presignCounter += 1;
			return `https://signed.example.test/${command.input.Key}?n=${presignCounter}`;
		},
	),
);

vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
	return {
		...actual,
		S3Client: class {
			send = sendMock;
		},
	};
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: getSignedUrlMock,
}));

// The URL-source branches download via axios (through constants/api).
const axiosGetMock = vi.hoisted(() => vi.fn());
vi.mock("axios", () => ({
	default: {
		get: axiosGetMock,
		post: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	},
}));

import {
	s3GetFileLink,
	s3UploadAssetImage,
	uploadAndResizeImage,
	uploadFile,
} from "../../../src/server/helpers/s3";

const BUCKET = "vitest-fake-bucket";

function uniqueKey(prefix: string): string {
	return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe("s3 helpers (AWS SDK mocked)", () => {
	beforeEach(() => {
		sendMock.mockClear();
		sendMock.mockResolvedValue({});
		getSignedUrlMock.mockClear();
	});

	describe("uploadFile", () => {
		it("uploads under documents/<sha256-checksum> and returns the canonical S3 URI", async () => {
			const buffer = Buffer.from(
				`file body ${Date.now()}-${Math.random()}`,
			);
			const checksum = createHash("sha256").update(buffer).digest("hex");

			const uri = await uploadFile({
				basePath: "documents",
				bufferOrUrl: buffer,
				mimeType: "application/pdf",
			});

			expect(uri).toBe(
				`https://${BUCKET}.s3.amazonaws.com/documents/${checksum}`,
			);
			expect(sendMock).toHaveBeenCalledTimes(1);
			const input = sendMock.mock.calls[0][0].input;
			expect(input.Key).toBe(`documents/${checksum}`);
			expect(input.Bucket).toBe(BUCKET);
			expect(input.ContentType).toBe("application/pdf");
			expect(input.ACL).toBe("private");
			expect(input.ServerSideEncryption).toBe("AES256");
			expect(Buffer.compare(input.Body, buffer)).toBe(0);
		});

		it("returns null when no buffer is provided or S3 rejects", async () => {
			expect(await uploadFile({ basePath: "documents" })).toBeNull();

			sendMock.mockRejectedValueOnce(new Error("s3 down"));
			expect(
				await uploadFile({
					basePath: "documents",
					bufferOrUrl: Buffer.from("x"),
				}),
			).toBeNull();
		});

		it("downloads a URL source before uploading; non-200 responses abort", async () => {
			const body = Buffer.from(
				`remote file ${Date.now()}-${Math.random()}`,
			);
			const checksum = createHash("sha256").update(body).digest("hex");
			axiosGetMock.mockResolvedValueOnce({ data: body, status: 200 });

			const uri = await uploadFile({
				basePath: "documents",
				bufferOrUrl: "https://remote.example.test/some-file",
				mimeType: "application/octet-stream",
			});

			expect(axiosGetMock).toHaveBeenCalledWith(
				"https://remote.example.test/some-file",
				{ responseType: "arraybuffer" },
			);
			expect(uri).toBe(
				`https://${BUCKET}.s3.amazonaws.com/documents/${checksum}`,
			);

			axiosGetMock.mockResolvedValueOnce({ data: null, status: 404 });
			expect(
				await uploadFile({
					basePath: "documents",
					bufferOrUrl: "https://remote.example.test/missing",
				}),
			).toBeNull();
		});
	});

	describe("s3UploadAssetImage", () => {
		it("puts the object and echoes the file name; null on failure", async () => {
			const fileName = uniqueKey("assets");
			const result = await s3UploadAssetImage({
				fileName,
				data: Buffer.from("img"),
				contentType: "image/webp",
			});
			expect(result).toBe(fileName);
			expect(sendMock.mock.calls[0][0].input.Key).toBe(fileName);

			sendMock.mockRejectedValueOnce(new Error("nope"));
			expect(
				await s3UploadAssetImage({
					fileName,
					data: Buffer.from("img"),
					contentType: "image/webp",
				}),
			).toBeNull();
		});
	});

	describe("uploadAndResizeImage (real sharp)", () => {
		it("converts a real PNG buffer to webp and uploads under <basePath>/<sha256>.webp", async () => {
			// Genuine tiny PNG produced by sharp — includes a random pixel so
			// the content hash (and Redis/S3 keys) differ between runs.
			const png = await sharp({
				create: {
					width: 8,
					height: 8,
					channels: 3,
					background: {
						r: Math.floor(Math.random() * 255),
						g: 128,
						b: 64,
					},
				},
			})
				.png()
				.toBuffer();

			const result = await uploadAndResizeImage({
				basePath: "tenants/avatars",
				bufferOrUrl: png,
				shouldResize: true,
			});

			expect(result).toMatch(/^tenants\/avatars\/[0-9a-f]{64}\.webp$/);
			expect(sendMock).toHaveBeenCalledTimes(1);
			const input = sendMock.mock.calls[0][0].input;
			expect(input.Key).toBe(result);
			expect(input.ContentType).toBe("image/webp");

			// The uploaded body really is a webp image, resized to width 600,
			// and the key embeds its sha256.
			const uploaded: Buffer = input.Body;
			const meta = await sharp(uploaded).metadata();
			expect(meta.format).toBe("webp");
			expect(meta.width).toBe(600);
			const hash = createHash("sha256").update(uploaded).digest("hex");
			expect(result).toBe(`tenants/avatars/${hash}.webp`);
		});

		it("skips resizing when shouldResize is false but still converts to webp", async () => {
			const png = await sharp({
				create: {
					width: 5,
					height: 7,
					channels: 3,
					background: { r: 1, g: 2, b: 3 },
				},
			})
				.png()
				.toBuffer();

			await uploadAndResizeImage({
				basePath: "properties/images",
				bufferOrUrl: png,
				shouldResize: false,
			});

			const meta = await sharp(
				sendMock.mock.calls[0][0].input.Body,
			).metadata();
			expect(meta.format).toBe("webp");
			expect(meta.width).toBe(5);
			expect(meta.height).toBe(7);
		});

		it("downloads a URL image source and converts it like a buffer", async () => {
			const png = await sharp({
				create: {
					width: 4,
					height: 4,
					channels: 3,
					background: {
						r: Math.floor(Math.random() * 255),
						g: 9,
						b: 9,
					},
				},
			})
				.png()
				.toBuffer();
			axiosGetMock.mockResolvedValueOnce({ data: png, status: 200 });

			const result = await uploadAndResizeImage({
				basePath: "properties/images",
				bufferOrUrl: "https://remote.example.test/pic.png",
				shouldResize: false,
			});

			expect(result).toMatch(/^properties\/images\/[0-9a-f]{64}\.webp$/);
			const meta = await sharp(
				sendMock.mock.calls[0][0].input.Body,
			).metadata();
			expect(meta.format).toBe("webp");
		});

		it("returns null for missing input or garbage image data", async () => {
			expect(
				await uploadAndResizeImage({
					basePath: "x",
					shouldResize: true,
				}),
			).toBeNull();
			expect(
				await uploadAndResizeImage({
					basePath: "x",
					bufferOrUrl: Buffer.from("this is not an image"),
					shouldResize: true,
				}),
			).toBeNull();
			expect(sendMock).not.toHaveBeenCalled();
		});
	});

	describe("s3GetFileLink", () => {
		it("presigns once, then serves the in-process/Redis cache", async () => {
			const key = uniqueKey("cache-test");

			const first = await s3GetFileLink({ fileName: key });
			expect(first).toBe(
				`https://signed.example.test/${key}?n=${presignCounter}`,
			);
			expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
			const cmd = getSignedUrlMock.mock.calls[0][1];
			expect(cmd.input.Key).toBe(key);
			expect(cmd.input.Bucket).toBe(BUCKET);
			expect(cmd.input.ResponseContentDisposition).toBeUndefined();

			// Second call: cached — the presigner is NOT hit again.
			const second = await s3GetFileLink({ fileName: key });
			expect(second).toBe(first);
			expect(getSignedUrlMock).toHaveBeenCalledTimes(1);

			// The Redis layer holds the same URL under the plain cache key.
			expect(
				await redisRetrieveKeyString<string>(`s3:presigned:${key}`),
			).toBe(first);
		});

		it("the downloadFileName variant presigns with attachment disposition under a separate cache key", async () => {
			const key = uniqueKey("att-test");

			const plain = await s3GetFileLink({ fileName: key });
			const attachment = await s3GetFileLink({
				fileName: key,
				downloadFileName: "My Report.pdf",
			});

			// Distinct cache entries → a second presign call happened.
			expect(getSignedUrlMock).toHaveBeenCalledTimes(2);
			expect(attachment).not.toBe(plain);
			const attCmd = getSignedUrlMock.mock.calls[1][1];
			expect(attCmd.input.ResponseContentDisposition).toBe(
				'attachment; filename="My Report.pdf"',
			);
			expect(
				await redisRetrieveKeyString<string>(`s3:presigned:att:${key}`),
			).toBe(attachment);

			// Repeat attachment call is served from cache.
			const again = await s3GetFileLink({
				fileName: key,
				downloadFileName: "My Report.pdf",
			});
			expect(again).toBe(attachment);
			expect(getSignedUrlMock).toHaveBeenCalledTimes(2);
		});

		it("sanitizes quotes and CR/LF out of the attachment file name", async () => {
			const key = uniqueKey("sanitize-test");
			await s3GetFileLink({
				fileName: key,
				downloadFileName: 'evil"name\r\ninjected.pdf',
			});
			const cmd = getSignedUrlMock.mock.calls[0][1];
			expect(cmd.input.ResponseContentDisposition).toBe(
				'attachment; filename="evil_name__injected.pdf"',
			);
		});

		it("normalizes a full S3 URL back to the bare key", async () => {
			const key = uniqueKey("url-normalize");
			await s3GetFileLink({
				fileName: `https://${BUCKET}.s3.amazonaws.com/${key}`,
			});
			expect(getSignedUrlMock.mock.calls[0][1].input.Key).toBe(key);
		});

		it("returns null when presigning throws", async () => {
			getSignedUrlMock.mockRejectedValueOnce(new Error("presign fail"));
			expect(
				await s3GetFileLink({ fileName: uniqueKey("boom") }),
			).toBeNull();
		});

		it("expires the in-process memo after 30s and falls back to Redis", async () => {
			const key = uniqueKey("ttl-test");
			const first = await s3GetFileLink({ fileName: key });
			expect(getSignedUrlMock).toHaveBeenCalledTimes(1);

			// Advance Date only — the in-process entry (30s TTL) lapses but
			// the Redis entry (55min) is still valid, so the same URL comes
			// back without re-presigning.
			vi.useFakeTimers({
				toFake: ["Date"],
				now: Date.now() + 31_000,
			});
			try {
				const second = await s3GetFileLink({ fileName: key });
				expect(second).toBe(first);
				expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
