export type IDocumentCategory =
	| "lease"
	| "id"
	| "receipt"
	| "invoice"
	| "insurance"
	| "inspection"
	| "contract"
	| "other";

export interface IDocumentCreateInput {
	userId: string;
	name: string;
	category: IDocumentCategory;
	propertyId?: string;
	unitId?: string;
	tenantId?: string;
	fileKey: string;
	fileName: string;
	mimeType: string;
	size: number;
}

export interface IDocument extends IDocumentCreateInput {
	id: string;
	/** Short-lived signed download URL, populated on read. */
	url?: string;
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}
