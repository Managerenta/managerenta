import { uploadFile } from "../../helpers";
import {
	createDocumentDB,
	deleteDocumentDB,
	getDocumentByIdDB,
	getDocumentsDB,
} from "../../models";
import type { IDocumentCategory } from "../../models/documents/types";

export async function createDocument({
	userId,
	name,
	category,
	propertyId,
	unitId,
	tenantId,
	buffer,
	fileName,
	mimeType,
	size,
}: {
	userId: string;
	name: string;
	category: IDocumentCategory;
	propertyId?: string;
	unitId?: string;
	tenantId?: string;
	buffer: Buffer;
	fileName: string;
	mimeType: string;
	size: number;
}) {
	const fileKey = await uploadFile({
		basePath: "documents",
		bufferOrUrl: buffer,
		mimeType,
	});
	if (!fileKey) return null;

	return createDocumentDB({
		payload: {
			userId,
			name,
			category,
			propertyId,
			unitId,
			tenantId,
			fileKey,
			fileName,
			mimeType,
			size,
		},
	});
}

export async function getDocuments({
	userId,
	limit,
	offset,
	category,
	propertyId,
	tenantId,
	search,
}: {
	userId: string;
	limit?: number;
	offset?: number;
	category?: string;
	propertyId?: string;
	tenantId?: string;
	search?: string;
}) {
	return getDocumentsDB({
		userId,
		limit,
		offset,
		category,
		propertyId,
		tenantId,
		search,
	});
}

export async function getDocumentById({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	return getDocumentByIdDB({ id, userId });
}

export async function deleteDocument({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	return deleteDocumentDB({ id, userId });
}
