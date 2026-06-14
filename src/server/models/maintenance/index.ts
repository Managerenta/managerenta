import mongoose, { type ClientSession } from "mongoose";
import { MAX_LIMIT } from "../../constants";
import { s3GetFileLink } from "../../helpers";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../utils";
import type { IMaintenanceCreateInput, IMaintenanceRequest } from "./types";

const collectionName = "maintenancerequests";

const schema = new mongoose.Schema<IMaintenanceRequest>(
	{
		userId: { type: String, required: true },
		propertyId: { type: String, required: true },
		unitId: { type: String, required: false },
		tenantId: { type: String, required: false },
		vendorId: { type: String, required: false },
		title: { type: String, required: true },
		description: { type: String, required: true },
		category: {
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
				"other",
			],
		},
		priority: {
			type: String,
			enum: ["low", "medium", "high", "urgent"],
			default: "medium",
		},
		status: {
			type: String,
			enum: ["open", "in-progress", "on-hold", "completed", "cancelled"],
			default: "open",
		},
		cost: { type: Number, required: false },
		scheduledDate: { type: Date, required: false },
		completedDate: { type: Date, required: false },
		images: { type: [String], default: [] },
		deleted: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

schema.index({ userId: 1, status: 1 });
schema.index({ userId: 1, deleted: 1 });
schema.index({ propertyId: 1 });
schema.index({ vendorId: 1 });

schema.pre("aggregate", function () {
	this.pipeline().unshift({ $match: { deleted: false } });
	this.pipeline().push({ $addFields: { id: { $toString: "$_id" } } });
	this.pipeline().push({ $project: { __v: 0, deleted: 0 } });
});

schema.post("aggregate", async (documents: IMaintenanceRequest[]) => {
	await Promise.allSettled(
		documents.map(async (doc) => {
			if (!doc.images?.length) return;
			doc.images = await Promise.all(
				doc.images.map(
					async (key) =>
						(await s3GetFileLink({ fileName: key })) ?? key,
				),
			);
		}),
	);
});

export const MaintenanceRequest: mongoose.Model<IMaintenanceRequest> =
	(mongoose.models[collectionName] as
		| mongoose.Model<IMaintenanceRequest>
		| undefined) ??
	mongoose.model<IMaintenanceRequest>(collectionName, schema);

export async function createMaintenanceRequestDB({
	payload,
	session,
}: {
	payload: IMaintenanceCreateInput;
	session?: ClientSession;
}): Promise<IMaintenanceRequest | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const doc = new MaintenanceRequest(payload);
		const result = await doc.save({ session });
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createMaintenanceRequestDB",
			success: "true",
		});
		return { ...result.toObject(), id: result.id };
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createMaintenanceRequestDB",
			success: "false",
		});
		return null;
	}
}

export async function getMaintenanceRequestsDB({
	userId,
	limit = 20,
	offset = 0,
	status,
	priority,
	propertyId,
	search,
	session,
}: {
	userId: string;
	limit?: number;
	offset?: number;
	status?: string;
	priority?: string;
	propertyId?: string;
	search?: string;
	session?: ClientSession;
}): Promise<{ requests: IMaintenanceRequest[]; total: number }> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const match: Record<string, unknown> = { userId };
		if (status && status !== "all") match.status = status;
		if (priority && priority !== "all") match.priority = priority;
		if (propertyId) match.propertyId = propertyId;
		if (search?.trim()) {
			const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			match.$or = [
				{ title: { $regex: safe, $options: "i" } },
				{ description: { $regex: safe, $options: "i" } },
			];
		}

		const safeLimit = Math.min(limit, MAX_LIMIT);
		const [requestsResult, countResult] = await Promise.allSettled([
			MaintenanceRequest.aggregate<IMaintenanceRequest>(
				[
					{ $match: match },
					{ $sort: { createdAt: -1 } },
					{ $skip: offset },
					{ $limit: safeLimit },
				],
				{ session },
			),
			MaintenanceRequest.aggregate<{ total: number }>(
				[{ $match: match }, { $count: "total" }],
				{ session },
			),
		]);

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getMaintenanceRequestsDB",
			success: "true",
		});

		const requests =
			requestsResult.status === "fulfilled" ? requestsResult.value : [];
		const total =
			countResult.status === "fulfilled"
				? (countResult.value[0]?.total ?? 0)
				: 0;
		return { requests, total };
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getMaintenanceRequestsDB",
			success: "false",
		});
		return { requests: [], total: 0 };
	}
}

export async function getMaintenanceRequestByIdDB({
	id,
	userId,
	session,
}: {
	id: string;
	userId: string;
	session?: ClientSession;
}): Promise<IMaintenanceRequest | null> {
	try {
		const result = (
			await MaintenanceRequest.aggregate<IMaintenanceRequest>(
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

export async function updateMaintenanceRequestDB({
	id,
	userId,
	payload,
	session,
}: {
	id: string;
	userId: string;
	payload: Partial<IMaintenanceCreateInput>;
	session?: ClientSession;
}): Promise<IMaintenanceRequest | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await MaintenanceRequest.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), userId, deleted: false },
			{ $set: payload },
			{ returnDocument: "after", session },
		);
		if (!result) return null;
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateMaintenanceRequestDB",
			success: "true",
		});
		return { ...result.toObject(), id: result.id };
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateMaintenanceRequestDB",
			success: "false",
		});
		return null;
	}
}

export async function deleteMaintenanceRequestDB({
	id,
	userId,
	session,
}: {
	id: string;
	userId: string;
	session?: ClientSession;
}): Promise<boolean> {
	try {
		const result = await MaintenanceRequest.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), userId, deleted: false },
			{ $set: { deleted: true } },
			{ returnDocument: "after", session },
		);
		return !!result;
	} catch {
		return false;
	}
}

export async function getMaintenanceStatsDB({
	userId,
}: {
	userId: string;
}): Promise<{
	open: number;
	inProgress: number;
	completed: number;
	total: number;
}> {
	try {
		const rows = await MaintenanceRequest.aggregate<{
			_id: string;
			count: number;
		}>([
			{ $match: { userId } },
			{ $group: { _id: "$status", count: { $sum: 1 } } },
		]);
		const map: Record<string, number> = {};
		let total = 0;
		for (const r of rows) {
			map[r._id] = r.count;
			total += r.count;
		}
		return {
			open: map.open ?? 0,
			inProgress: map["in-progress"] ?? 0,
			completed: map.completed ?? 0,
			total,
		};
	} catch {
		return { open: 0, inProgress: 0, completed: 0, total: 0 };
	}
}

export * from "./types";
