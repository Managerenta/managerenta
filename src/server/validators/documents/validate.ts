import zod from "zod";

export const documentCategoryEnum = zod.enum([
	"lease",
	"id",
	"receipt",
	"invoice",
	"insurance",
	"inspection",
	"contract",
	"other",
]);

/** Fields parsed from the multipart upload form (the file itself is separate). */
export const createDocumentFieldsSchema = zod.object({
	name: zod.string().min(1).max(200),
	category: documentCategoryEnum,
	propertyId: zod.string().min(1).optional(),
	unitId: zod.string().min(1).optional(),
	tenantId: zod.string().min(1).optional(),
});

export const documentParamsSchema = zod
	.object({ id: zod.string().min(1) })
	.strict();

export const getDocumentsQuerySchema = zod.object({
	limit: zod.coerce.number().int().min(1).max(100).optional(),
	offset: zod.coerce.number().int().min(0).optional(),
	category: zod.union([documentCategoryEnum, zod.literal("all")]).optional(),
	propertyId: zod.string().optional(),
	tenantId: zod.string().optional(),
	search: zod.string().optional(),
});

/** Allowlist of document file types we accept for upload. */
export const ALLOWED_DOCUMENT_MIME_TYPES: readonly string[] = [
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"text/plain",
	"text/csv",
];

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MiB
