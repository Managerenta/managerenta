import mongoose, { type ClientSession } from "mongoose";
import { MAX_LIMIT } from "../../constants";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../utils";
import type { IVendor, IVendorCreateInput } from "./types";

const collectionName = "vendors";

const schema = new mongoose.Schema<IVendor>(
	{
		userId: { type: String, required: true },
		name: { type: String, required: true },
		company: { type: String, required: false },
		specialty: {
			type: String,
			required: true,
			enum: [
				"plumbing",
				"electrical",
				"hvac",
				"appliance",
				"structural",
				"pest",
				"cleaning",
				"general",
				"other",
			],
		},
		phone: { type: String, required: false },
		email: { type: String, required: false },
		address: { type: String, required: false },
		notes: { type: String, required: false },
		rating: { type: Number, required: false, min: 0, max: 5 },
		deleted: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

schema.index({ userId: 1, deleted: 1 });
schema.index({ userId: 1, specialty: 1 });

schema.pre("aggregate", function () {
	this.pipeline().unshift({ $match: { deleted: false } });
	this.pipeline().push({ $addFields: { id: { $toString: "$_id" } } });
	this.pipeline().push({ $project: { __v: 0, deleted: 0 } });
});

export const Vendor: mongoose.Model<IVendor> =
	(mongoose.models[collectionName] as mongoose.Model<IVendor> | undefined) ??
	mongoose.model<IVendor>(collectionName, schema);

export async function createVendorDB({
	payload,
	session,
}: {
	payload: IVendorCreateInput;
	session?: ClientSession;
}): Promise<IVendor | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const doc = new Vendor(payload);
		const result = await doc.save({ session });
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createVendorDB",
			success: "true",
		});
		return { ...result.toObject(), id: result.id };
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createVendorDB",
			success: "false",
		});
		return null;
	}
}

export async function getVendorsDB({
	userId,
	limit = 50,
	offset = 0,
	specialty,
	search,
	session,
}: {
	userId: string;
	limit?: number;
	offset?: number;
	specialty?: string;
	search?: string;
	session?: ClientSession;
}): Promise<{ vendors: IVendor[]; total: number }> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const match: Record<string, unknown> = { userId };
		if (specialty && specialty !== "all") match.specialty = specialty;
		if (search?.trim()) {
			const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			match.$or = [
				{ name: { $regex: safe, $options: "i" } },
				{ company: { $regex: safe, $options: "i" } },
			];
		}

		const safeLimit = Math.min(limit, MAX_LIMIT);
		const [vendorsResult, countResult] = await Promise.allSettled([
			Vendor.aggregate<IVendor>(
				[
					{ $match: match },
					{ $sort: { name: 1 } },
					{ $skip: offset },
					{ $limit: safeLimit },
				],
				{ session },
			),
			Vendor.aggregate<{ total: number }>(
				[{ $match: match }, { $count: "total" }],
				{ session },
			),
		]);

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getVendorsDB",
			success: "true",
		});

		const vendors =
			vendorsResult.status === "fulfilled" ? vendorsResult.value : [];
		const total =
			countResult.status === "fulfilled"
				? (countResult.value[0]?.total ?? 0)
				: 0;
		return { vendors, total };
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getVendorsDB",
			success: "false",
		});
		return { vendors: [], total: 0 };
	}
}

export async function getVendorByIdDB({
	id,
	userId,
	session,
}: {
	id: string;
	userId: string;
	session?: ClientSession;
}): Promise<IVendor | null> {
	try {
		const result = (
			await Vendor.aggregate<IVendor>(
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

export async function updateVendorDB({
	id,
	userId,
	payload,
	session,
}: {
	id: string;
	userId: string;
	payload: Partial<IVendorCreateInput>;
	session?: ClientSession;
}): Promise<IVendor | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await Vendor.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), userId, deleted: false },
			{ $set: payload },
			{ returnDocument: "after", session },
		);
		if (!result) return null;
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateVendorDB",
			success: "true",
		});
		return { ...result.toObject(), id: result.id };
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateVendorDB",
			success: "false",
		});
		return null;
	}
}

export async function deleteVendorDB({
	id,
	userId,
	session,
}: {
	id: string;
	userId: string;
	session?: ClientSession;
}): Promise<boolean> {
	try {
		const result = await Vendor.findOneAndUpdate(
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
