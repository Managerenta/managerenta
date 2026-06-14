import mongoose, { type ClientSession } from "mongoose";
import { MAX_LIMIT } from "../../constants";
import { s3GetFileLink } from "../../helpers";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../utils";
import type { IDocument, IDocumentCreateInput } from "./types";

const collectionName = "documents";

const schema = new mongoose.Schema<IDocument>(
	{
		userId: { type: String, required: true },
		name: { type: String, required: true },
		category: {
			type: String,
			required: true,
			enum: [
				"lease",
				"id",
				"receipt",
				"invoice",
				"insurance",
				"inspection",
				"contract",
				"other",
			],
		},
		propertyId: { type: String, required: false },
		unitId: { type: String, required: false },
		tenantId: { type: String, required: false },
		fileKey: { type: String, required: true },
		fileName: { type: String, required: true },
		mimeType: { type: String, required: true },
		size: { type: Number, required: true },
		deleted: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

schema.index({ userId: 1, deleted: 1 });
schema.index({ userId: 1, category: 1 });
schema.index({ propertyId: 1 });
schema.index({ tenantId: 1 });

schema.pre("aggregate", function () {
	this.pipeline().unshift({ $match: { deleted: false } });
	this.pipeline().push({ $addFields: { id: { $toString: "$_id" } } });
	this.pipeline().push({ $project: { __v: 0, deleted: 0 } });
});

schema.post("aggregate", async (documents: IDocument[]) => {
	await Promise.allSettled(
		documents.map(async (doc) => {
			if (!doc.fileKey) return;
			doc.url =
				(await s3GetFileLink({ fileName: doc.fileKey })) ?? undefined;
		}),
	);
});

export const DocumentModel: mongoose.Model<IDocument> =
	(mongoose.models[collectionName] as
		| mongoose.Model<IDocument>
		| undefined) ?? mongoose.model<IDocument>(collectionName, schema);

export async function createDocumentDB({
	payload,
	session,
}: {
	payload: IDocumentCreateInput;
	session?: ClientSession;
}): Promise<IDocument | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const doc = new DocumentModel(payload);
		const result = await doc.save({ session });
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createDocumentDB",
			success: "true",
		});
		const obj: IDocument = { ...result.toObject(), id: result.id };
		obj.url = (await s3GetFileLink({ fileName: obj.fileKey })) ?? undefined;
		return obj;
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createDocumentDB",
			success: "false",
		});
		return null;
	}
}

export async function getDocumentsDB({
	userId,
	limit = 50,
	offset = 0,
	category,
	propertyId,
	tenantId,
	search,
	session,
}: {
	userId: string;
	limit?: number;
	offset?: number;
	category?: string;
	propertyId?: string;
	tenantId?: string;
	search?: string;
	session?: ClientSession;
}): Promise<{ documents: IDocument[]; total: number }> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const match: Record<string, unknown> = { userId };
		if (category && category !== "all") match.category = category;
		if (propertyId) match.propertyId = propertyId;
		if (tenantId) match.tenantId = tenantId;
		if (search?.trim()) {
			const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			match.$or = [
				{ name: { $regex: safe, $options: "i" } },
				{ fileName: { $regex: safe, $options: "i" } },
			];
		}

		const safeLimit = Math.min(limit, MAX_LIMIT);
		const [docsResult, countResult] = await Promise.allSettled([
			DocumentModel.aggregate<IDocument>(
				[
					{ $match: match },
					{ $sort: { createdAt: -1 } },
					{ $skip: offset },
					{ $limit: safeLimit },
				],
				{ session },
			),
			DocumentModel.aggregate<{ total: number }>(
				[{ $match: match }, { $count: "total" }],
				{ session },
			),
		]);

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getDocumentsDB",
			success: "true",
		});

		const documents =
			docsResult.status === "fulfilled" ? docsResult.value : [];
		const total =
			countResult.status === "fulfilled"
				? (countResult.value[0]?.total ?? 0)
				: 0;
		return { documents, total };
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getDocumentsDB",
			success: "false",
		});
		return { documents: [], total: 0 };
	}
}

export async function getDocumentByIdDB({
	id,
	userId,
	session,
}: {
	id: string;
	userId: string;
	session?: ClientSession;
}): Promise<IDocument | null> {
	try {
		const result = (
			await DocumentModel.aggregate<IDocument>(
				[
					{
						$match: {
							_id: new mongoose.Types.ObjectId(id),
							userId,
						},
					},
					{ $limit: 1 },
				],
				{ session },
			)
		).at(0);
		return result ?? null;
	} catch {
		return null;
	}
}

export async function deleteDocumentDB({
	id,
	userId,
	session,
}: {
	id: string;
	userId: string;
	session?: ClientSession;
}): Promise<boolean> {
	try {
		const result = await DocumentModel.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), userId, deleted: false },
			{ $set: { deleted: true } },
			{ returnDocument: "after", session },
		);
		return !!result;
	} catch {
		return false;
	}
}

export * from "./types";
