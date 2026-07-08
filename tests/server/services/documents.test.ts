import { createHash } from "node:crypto";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import { newId, seedProperty } from "../../helpers/seed";

// ── Mock the true externals: S3 uploads and URL presigning ────────────────
const sendMock = vi.hoisted(() => vi.fn(async () => ({})));
const getSignedUrlMock = vi.hoisted(() =>
	vi.fn(
		async (
			_client: unknown,
			command: { input: { Key: string } },
		) => `https://signed.example.test/${command.input.Key}`,
	),
);

vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@aws-sdk/client-s3")>();
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

import { DocumentModel } from "../../../src/server/models/documents";
import {
	createDocument,
	deleteDocument,
	getDocumentById,
	getDocuments,
} from "../../../src/server/services/documents";

const BUCKET = "vitest-fake-bucket";

describe("documents service (S3 mocked)", () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	beforeEach(async () => {
		await clearTestDB();
		sendMock.mockClear();
		getSignedUrlMock.mockClear();
	});

	afterAll(async () => {
		await clearTestDB();
	});

	it("createDocument uploads under documents/<sha256> and stores metadata with a presigned url", async () => {
		const userId = newId();
		const { propertyId } = await seedProperty({ userId });
		const buffer = Buffer.from(
			`lease agreement body %PDF-1.4 ${Date.now()}-${Math.random()}`,
		);
		const checksum = createHash("sha256").update(buffer).digest("hex");

		const doc = await createDocument({
			userId,
			name: "Lease 2026",
			category: "lease",
			propertyId,
			buffer,
			fileName: "lease-2026.pdf",
			mimeType: "application/pdf",
			size: buffer.length,
		});

		// S3 PutObject received the content-addressed key.
		expect(sendMock).toHaveBeenCalledTimes(1);
		const putInput = sendMock.mock.calls[0][0].input;
		expect(putInput.Key).toBe(`documents/${checksum}`);
		expect(putInput.Bucket).toBe(BUCKET);
		expect(putInput.ContentType).toBe("application/pdf");
		expect(putInput.ServerSideEncryption).toBe("AES256");

		// Metadata persisted; fileKey is the canonical S3 URI.
		expect(doc).not.toBeNull();
		expect(doc?.name).toBe("Lease 2026");
		expect(doc?.category).toBe("lease");
		expect(doc?.propertyId).toBe(propertyId);
		expect(doc?.fileName).toBe("lease-2026.pdf");
		expect(doc?.size).toBe(buffer.length);
		expect(doc?.fileKey).toBe(
			`https://${BUCKET}.s3.amazonaws.com/documents/${checksum}`,
		);

		// The returned url comes from the (mocked) presigner, keyed off the
		// normalized S3 key.
		expect(doc?.url).toBe(
			`https://signed.example.test/documents/${checksum}`,
		);

		const stored = await DocumentModel.findById(doc?.id).lean();
		expect(stored?.mimeType).toBe("application/pdf");
		expect(stored?.deleted).toBe(false);
	});

	it("createDocument returns null and stores nothing when the S3 upload fails", async () => {
		sendMock.mockRejectedValueOnce(new Error("s3 down"));
		const userId = newId();

		const doc = await createDocument({
			userId,
			name: "Doomed",
			category: "other",
			buffer: Buffer.from("zzz"),
			fileName: "doomed.txt",
			mimeType: "text/plain",
			size: 3,
		});

		expect(doc).toBeNull();
		expect(await DocumentModel.countDocuments({ userId })).toBe(0);
	});

	it("getDocuments filters by category/search and presigns with attachment disposition", async () => {
		const userId = newId();
		// Unique content per run: presigned links are cached in Redis by
		// content hash, and a warm cache would hide the presigner call.
		const unique = `${Date.now()}-${Math.random()}`;
		await createDocument({
			userId,
			name: "January receipt",
			category: "receipt",
			buffer: Buffer.from(`receipt-jan-${unique}`),
			fileName: "receipt-jan.pdf",
			mimeType: "application/pdf",
			size: 11,
		});
		await createDocument({
			userId,
			name: "Insurance policy",
			category: "insurance",
			buffer: Buffer.from(`policy-doc-${unique}`),
			fileName: "policy.pdf",
			mimeType: "application/pdf",
			size: 10,
		});

		const receipts = await getDocuments({ userId, category: "receipt" });
		expect(receipts.total).toBe(1);
		expect(receipts.documents[0].name).toBe("January receipt");

		const searched = await getDocuments({ userId, search: "insurance" });
		expect(searched.total).toBe(1);

		// The read path presigns download links that force attachment
		// disposition with the original file name.
		const attachmentCalls = getSignedUrlMock.mock.calls.filter(
			(c) =>
				c[1].input.ResponseContentDisposition ===
				'attachment; filename="receipt-jan.pdf"',
		);
		expect(attachmentCalls.length).toBeGreaterThan(0);

		// Foreign user sees nothing.
		const foreign = await getDocuments({ userId: newId() });
		expect(foreign.total).toBe(0);
	});

	it("deleteDocument soft-deletes and hides the document, scoped to the owner", async () => {
		const userId = newId();
		const doc = await createDocument({
			userId,
			name: "Contract",
			category: "contract",
			buffer: Buffer.from("contract-body"),
			fileName: "contract.pdf",
			mimeType: "application/pdf",
			size: 13,
		});

		// Wrong owner cannot delete.
		expect(
			await deleteDocument({ id: doc?.id as string, userId: newId() }),
		).toBeFalsy();

		expect(
			await deleteDocument({ id: doc?.id as string, userId }),
		).toBeTruthy();
		expect(
			await getDocumentById({ id: doc?.id as string, userId }),
		).toBeNull();
		const raw = await DocumentModel.findById(doc?.id).lean();
		expect(raw?.deleted).toBe(true);
	});
});
