import {
	ErrInvalidFields,
	ErrInvalidFileType,
	ErrMissingFile,
	ErrTryAgain,
} from "@/server/constants";
import {
	assertWriteRole,
	created,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { createDocument, getDocuments } from "@/server/services";
import {
	ALLOWED_DOCUMENT_MIME_TYPES,
	createDocumentFieldsSchema,
	getDocumentsQuerySchema,
	MAX_DOCUMENT_BYTES,
} from "@/server/validators/documents/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/documents" },
	withAuth(async ({ req, auth }) => {
		try {
			const url = new URL(req.url);
			const query = getDocumentsQuerySchema.safeParse(
				Object.fromEntries(url.searchParams),
			);
			if (!query.success) throw ErrInvalidFields;

			const result = await getDocuments({
				userId: auth.effectiveOwnerId,
				...query.data,
			});
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler(
	{ route: "/api/documents" },
	withAuth(async ({ req, auth }) => {
		try {
			assertWriteRole(auth);

			const form = await req.formData();
			const file = form.get("file");
			if (!(file instanceof File)) throw ErrMissingFile;
			if (file.size > MAX_DOCUMENT_BYTES) throw ErrInvalidFields;
			if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type)) {
				throw ErrInvalidFileType;
			}

			const fields = createDocumentFieldsSchema.safeParse({
				name: form.get("name")?.toString() ?? file.name,
				category: form.get("category")?.toString(),
				propertyId: form.get("propertyId")?.toString() || undefined,
				unitId: form.get("unitId")?.toString() || undefined,
				tenantId: form.get("tenantId")?.toString() || undefined,
			});
			if (!fields.success) throw ErrInvalidFields;

			const buffer = Buffer.from(await file.arrayBuffer());
			const result = await createDocument({
				userId: auth.effectiveOwnerId,
				...fields.data,
				buffer,
				fileName: file.name,
				mimeType: file.type,
				size: file.size,
			});
			if (!result) throw ErrTryAgain;
			return created(result, "Document uploaded");
		} catch (error) {
			return handleError(error);
		}
	}),
);
