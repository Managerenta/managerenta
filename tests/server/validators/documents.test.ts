import { describe, expect, it } from "vitest";
import {
	ALLOWED_DOCUMENT_MIME_TYPES,
	MAX_DOCUMENT_BYTES,
	createDocumentFieldsSchema,
	documentCategoryEnum,
	documentParamsSchema,
	getDocumentsQuerySchema,
} from "@/server/validators/documents/validate";

describe("documentCategoryEnum", () => {
	it("accepts every documented category", () => {
		for (const c of [
			"lease",
			"id",
			"receipt",
			"invoice",
			"insurance",
			"inspection",
			"contract",
			"other",
		]) {
			expect(documentCategoryEnum.safeParse(c).success).toBe(true);
		}
	});

	it("rejects unknown categories", () => {
		expect(documentCategoryEnum.safeParse("passport").success).toBe(false);
		expect(documentCategoryEnum.safeParse("LEASE").success).toBe(false);
	});
});

describe("createDocumentFieldsSchema", () => {
	it("accepts minimal valid fields", () => {
		const result = createDocumentFieldsSchema.safeParse({
			name: "Lease agreement",
			category: "lease",
		});
		expect(result.success).toBe(true);
		expect(result.data).toEqual({
			name: "Lease agreement",
			category: "lease",
		});
	});

	it("accepts optional association ids", () => {
		const result = createDocumentFieldsSchema.safeParse({
			name: "Receipt #1",
			category: "receipt",
			propertyId: "p1",
			unitId: "u1",
			tenantId: "t1",
		});
		expect(result.success).toBe(true);
	});

	it("enforces name length 1..200", () => {
		expect(
			createDocumentFieldsSchema.safeParse({ name: "", category: "id" })
				.success,
		).toBe(false);
		expect(
			createDocumentFieldsSchema.safeParse({
				name: "n".repeat(200),
				category: "id",
			}).success,
		).toBe(true);
		expect(
			createDocumentFieldsSchema.safeParse({
				name: "n".repeat(201),
				category: "id",
			}).success,
		).toBe(false);
	});

	it("rejects empty-string association ids", () => {
		expect(
			createDocumentFieldsSchema.safeParse({
				name: "x",
				category: "id",
				propertyId: "",
			}).success,
		).toBe(false);
	});

	it("requires name and category", () => {
		expect(createDocumentFieldsSchema.safeParse({}).success).toBe(false);
		expect(
			createDocumentFieldsSchema.safeParse({ name: "x" }).success,
		).toBe(false);
	});
});

describe("documentParamsSchema", () => {
	it("requires a non-empty id and is strict", () => {
		expect(documentParamsSchema.safeParse({ id: "abc" }).success).toBe(
			true,
		);
		expect(documentParamsSchema.safeParse({ id: "" }).success).toBe(false);
		expect(
			documentParamsSchema.safeParse({ id: "abc", extra: 1 }).success,
		).toBe(false);
	});
});

describe("getDocumentsQuerySchema", () => {
	it("accepts an empty query", () => {
		expect(getDocumentsQuerySchema.safeParse({}).success).toBe(true);
	});

	it("coerces pagination and accepts the 'all' category sentinel", () => {
		const result = getDocumentsQuerySchema.safeParse({
			limit: "50",
			offset: "0",
			category: "all",
			search: "lease",
		});
		expect(result.success).toBe(true);
		expect(result.data?.limit).toBe(50);
		expect(result.data?.offset).toBe(0);
		expect(result.data?.category).toBe("all");
	});

	it("accepts a concrete category and rejects unknown ones", () => {
		expect(
			getDocumentsQuerySchema.safeParse({ category: "invoice" }).success,
		).toBe(true);
		expect(
			getDocumentsQuerySchema.safeParse({ category: "bogus" }).success,
		).toBe(false);
	});

	it("bounds limit to 1..100", () => {
		expect(getDocumentsQuerySchema.safeParse({ limit: "0" }).success).toBe(
			false,
		);
		expect(
			getDocumentsQuerySchema.safeParse({ limit: "101" }).success,
		).toBe(false);
	});
});

describe("upload constants", () => {
	it("caps documents at 25 MiB", () => {
		expect(MAX_DOCUMENT_BYTES).toBe(25 * 1024 * 1024);
	});

	it("allows common document types but no executables or svg", () => {
		expect(ALLOWED_DOCUMENT_MIME_TYPES).toContain("application/pdf");
		expect(ALLOWED_DOCUMENT_MIME_TYPES).toContain("text/csv");
		expect(ALLOWED_DOCUMENT_MIME_TYPES).not.toContain("image/svg+xml");
		expect(ALLOWED_DOCUMENT_MIME_TYPES).not.toContain(
			"application/x-msdownload",
		);
		expect(ALLOWED_DOCUMENT_MIME_TYPES).not.toContain("text/html");
	});
});
