import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const getSignedUrlMock = vi.fn(async () => "https://fake-s3.example/signed-doc");
vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: (...args: unknown[]) => getSignedUrlMock(...(args as [])),
}));

import { disconnectRedis } from "../../../src/server/databases";
import {
	createDocumentDB,
	deleteDocumentDB,
	DocumentModel,
	getDocumentByIdDB,
	getDocumentsDB,
} from "../../../src/server/models/documents";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const USER = "user-docs-1";
const OTHER = "user-docs-2";

function payload(overrides: Record<string, unknown> = {}) {
	return {
		userId: USER,
		name: "Lease agreement",
		category: "lease" as const,
		fileKey: `docs/${crypto.randomUUID()}.pdf`,
		fileName: "lease.pdf",
		mimeType: "application/pdf",
		size: 1024,
		...overrides,
	};
}

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
	getSignedUrlMock.mockClear();
	getSignedUrlMock.mockResolvedValue("https://fake-s3.example/signed-doc");
});
afterAll(async () => {
	await dropTestDB();
	await disconnectRedis().catch(() => {});
});

describe("createDocumentDB", () => {
	it("creates a document and returns a presigned url", async () => {
		const doc = await createDocumentDB({ payload: payload() });
		expect(doc).not.toBeNull();
		expect(doc?.url).toBe("https://fake-s3.example/signed-doc");

		const inDb = await DocumentModel.findById(doc?.id).lean();
		expect(inDb?.name).toBe("Lease agreement");
		expect(inDb?.deleted).toBe(false);
		// url is derived, never stored
		expect((inDb as never as { url?: string })?.url).toBeUndefined();
	});

	it("returns null when required fields are missing", async () => {
		const doc = await createDocumentDB({
			payload: { userId: USER, name: "No file" } as never,
		});
		expect(doc).toBeNull();
		expect(await DocumentModel.countDocuments({})).toBe(0);
	});

	it("handles presign failure gracefully (url undefined, doc still saved)", async () => {
		getSignedUrlMock.mockRejectedValue(new Error("aws down"));
		const doc = await createDocumentDB({ payload: payload() });
		expect(doc).not.toBeNull();
		expect(doc?.url).toBeUndefined();
		expect(await DocumentModel.countDocuments({})).toBe(1);
	});
});

describe("getDocumentsDB", () => {
	it("lists only the user's non-deleted documents, newest first, with urls", async () => {
		await DocumentModel.create({
			...payload({ name: "Old" }),
			createdAt: new Date("2024-01-01"),
		});
		await DocumentModel.create({
			...payload({ name: "New" }),
			createdAt: new Date("2024-06-01"),
		});
		await DocumentModel.create({ ...payload({ name: "Del" }), deleted: true });
		await DocumentModel.create(payload({ name: "Foreign", userId: OTHER }));

		const { documents, total } = await getDocumentsDB({ userId: USER });
		expect(total).toBe(2);
		expect(documents.map((d) => d.name)).toEqual(["New", "Old"]);
		for (const d of documents) {
			expect(d.url).toBe("https://fake-s3.example/signed-doc");
			expect(typeof d.id).toBe("string");
		}
	});

	it("filters by category, propertyId, tenantId; 'all' disables category filter", async () => {
		await DocumentModel.create(
			payload({ name: "A", category: "lease", propertyId: "p1", tenantId: "t1" }),
		);
		await DocumentModel.create(
			payload({ name: "B", category: "receipt", propertyId: "p2", tenantId: "t2" }),
		);

		const byCategory = await getDocumentsDB({ userId: USER, category: "receipt" });
		expect(byCategory.documents.map((d) => d.name)).toEqual(["B"]);

		const byProperty = await getDocumentsDB({ userId: USER, propertyId: "p1" });
		expect(byProperty.documents.map((d) => d.name)).toEqual(["A"]);

		const byTenant = await getDocumentsDB({ userId: USER, tenantId: "t2" });
		expect(byTenant.documents.map((d) => d.name)).toEqual(["B"]);

		const all = await getDocumentsDB({ userId: USER, category: "all" });
		expect(all.total).toBe(2);
	});

	it("searches name and fileName case-insensitively", async () => {
		await DocumentModel.create(payload({ name: "Insurance policy" }));
		await DocumentModel.create(payload({ name: "Other", fileName: "POLICY-scan.pdf" }));
		await DocumentModel.create(payload({ name: "Unrelated" }));

		const res = await getDocumentsDB({ userId: USER, search: "policy" });
		expect(res.total).toBe(2);
	});

	it("treats regex metacharacters literally and does not throw", async () => {
		await DocumentModel.create(payload({ name: "Receipt (Jan) [final].pdf" }));
		await DocumentModel.create(payload({ name: "Receipt Jan final.pdf" }));

		const literal = await getDocumentsDB({ userId: USER, search: "(Jan) [final]" });
		expect(literal.total).toBe(1);
		expect(literal.documents[0]?.name).toBe("Receipt (Jan) [final].pdf");

		const wild = await getDocumentsDB({ userId: USER, search: ".+" });
		expect(wild.total).toBe(0);
	});

	it("paginates with limit/offset and caps limit at MAX_LIMIT (50)", async () => {
		const docs = Array.from({ length: 55 }, (_, i) => ({
			...payload({ name: `D${i}` }),
			createdAt: new Date(2024, 0, 1, 0, i),
		}));
		await DocumentModel.insertMany(docs);

		const page = await getDocumentsDB({ userId: USER, limit: 2, offset: 1 });
		expect(page.total).toBe(55);
		expect(page.documents.map((d) => d.name)).toEqual(["D53", "D52"]);

		const capped = await getDocumentsDB({ userId: USER, limit: 5000 });
		expect(capped.documents).toHaveLength(50);
	});

	it("leaves url unset when presigning fails, without rejecting", async () => {
		getSignedUrlMock.mockRejectedValue(new Error("aws down"));
		await DocumentModel.create(payload({ name: "NoUrl" }));
		const { documents } = await getDocumentsDB({ userId: USER });
		expect(documents).toHaveLength(1);
		expect(documents[0]?.url).toBeUndefined();
	});
});

describe("getDocumentByIdDB", () => {
	it("returns the document for its owner with a presigned url", async () => {
		const created = await createDocumentDB({ payload: payload() });
		const found = await getDocumentByIdDB({ id: created!.id, userId: USER });
		expect(found?.id).toBe(created!.id);
		expect(found?.url).toBe("https://fake-s3.example/signed-doc");
	});

	it("returns null for wrong owner, deleted doc, or malformed id", async () => {
		const created = await createDocumentDB({ payload: payload() });
		expect(await getDocumentByIdDB({ id: created!.id, userId: OTHER })).toBeNull();

		await deleteDocumentDB({ id: created!.id, userId: USER });
		expect(await getDocumentByIdDB({ id: created!.id, userId: USER })).toBeNull();

		expect(await getDocumentByIdDB({ id: "###", userId: USER })).toBeNull();
	});
});

describe("deleteDocumentDB", () => {
	it("soft-deletes and returns true; repeat delete returns false", async () => {
		const created = await createDocumentDB({ payload: payload() });
		expect(await deleteDocumentDB({ id: created!.id, userId: USER })).toBe(true);
		const inDb = await DocumentModel.findById(created!.id).lean();
		expect(inDb?.deleted).toBe(true);
		expect(await deleteDocumentDB({ id: created!.id, userId: USER })).toBe(false);
	});

	it("returns false for wrong owner and leaves the doc intact", async () => {
		const created = await createDocumentDB({ payload: payload() });
		expect(await deleteDocumentDB({ id: created!.id, userId: OTHER })).toBe(false);
		const inDb = await DocumentModel.findById(created!.id).lean();
		expect(inDb?.deleted).toBe(false);
	});
});
