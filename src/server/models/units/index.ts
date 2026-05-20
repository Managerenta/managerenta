import mongoose, { type ClientSession } from "mongoose";
import { MAX_LIMIT } from "../../constants";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../utils";
import { resolveTenant, tenantSubSchema } from "./tenant";
import type { IUnitTenant } from "./tenant/types";
import {
	IPaymentStatus,
	type IUnit,
	type IUnitCreateInput,
	type IUnitPopulated,
	IUnitStatus,
} from "./types";

const collectionName = "units";

const schema = new mongoose.Schema<IUnit>(
	{
		name: { type: String, required: true },
		rent: { type: Number, required: true },
		propertyId: { type: String, required: true },
		userId: { type: String, required: true },
		status: {
			type: String,
			enum: Object.values(IUnitStatus),
			default: IUnitStatus.Vacant,
		},
		tenant: { type: tenantSubSchema, default: null },
		dueDate: { type: Date, default: null },
		paymentStatus: {
			type: String,
			enum: Object.values(IPaymentStatus),
			default: null,
		},
		vacantDays: { type: Number, default: null },
		deleted: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

schema.index({ userId: 1, status: 1 });
schema.index({ userId: 1, propertyId: 1 });
schema.index({ propertyId: 1 });
schema.index({ userId: 1, deleted: 1 });

schema.pre("aggregate", function () {
	this.pipeline().unshift({ $match: { deleted: false } });
	this.pipeline().push({ $addFields: { id: { $toString: "$_id" } } });
	this.pipeline().push({ $project: { __v: 0, deleted: 0 } });
});

export const Unit = mongoose.model<IUnit>(collectionName, schema);

export async function createUnitDB({
	payload,
	session,
}: {
	payload: IUnitCreateInput;
	session?: ClientSession;
}): Promise<IUnit | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const doc = new Unit(payload);
		const result = await doc.save({ session });
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createUnitDB",
			success: "true",
		});
		return { ...result.toObject(), id: result.id };
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createUnitDB",
			success: "false",
		});
		return null;
	}
}

export async function getUnitsByPropertyIdDB({
	propertyId,
	userId,
	session,
}: {
	propertyId: string;
	userId: string;
	session?: ClientSession;
}): Promise<IUnitPopulated[]> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const results = await Unit.aggregate<IUnit & { tenantDoc?: any }>(
			[
				{ $match: { propertyId, userId } },
				{ $sort: { createdAt: 1 } },
				{
					$lookup: {
						from: "tenants",
						let: { tenantIdStr: "$tenant.tenantId" },
						pipeline: [
							{
								$match: {
									$expr: {
										$eq: [
											{ $toString: "$_id" },
											"$$tenantIdStr",
										],
									},
								},
							},
							{ $project: { _id: 1, avatar: 1 } },
						],
						as: "_tenantLookup",
					},
				},
				{
					$addFields: {
						"tenant.avatar": {
							$ifNull: [
								"$tenant.avatar",
								{ $arrayElemAt: ["$_tenantLookup.avatar", 0] },
							],
						},
					},
				},
				{ $project: { _tenantLookup: 0 } },
			],
			{ session },
		);

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUnitsByPropertyIdDB",
			success: "true",
		});

		const settled = await Promise.allSettled(
			results.map(async (r) => ({
				...r,
				tenant: await resolveTenant(r.tenant),
			})),
		);
		return settled
			.filter(
				(s): s is PromiseFulfilledResult<IUnitPopulated> =>
					s.status === "fulfilled",
			)
			.map((s) => s.value);
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUnitsByPropertyIdDB",
			success: "false",
		});
		return [];
	}
}

export async function getUnitStatsDB({ userId }: { userId: string }): Promise<{
	occupiedUnits: number;
	vacantUnits: number;
}> {
	const results = await Unit.aggregate([
		{ $match: { userId } },
		{ $group: { _id: "$status", count: { $sum: 1 } } },
	]);

	const map: Record<string, number> = {};
	for (const r of results) map[r._id] = r.count;

	return {
		occupiedUnits: map.Occupied ?? 0,
		vacantUnits: map.Vacant ?? 0,
	};
}

export async function setUnitOccupiedDB({
	id,
	tenant,
	session,
}: {
	id: string;
	tenant: IUnitTenant;
	session?: ClientSession;
}): Promise<void> {
	await Unit.findByIdAndUpdate(
		id,
		{ $set: { status: "Occupied", tenant } },
		{ session },
	);
}

export async function setUnitVacantDB({
	id,
	session,
}: {
	id: string;
	session?: ClientSession;
}): Promise<void> {
	await Unit.findByIdAndUpdate(
		id,
		{ $set: { status: "Vacant", tenant: null } },
		{ session },
	);
}

export async function getVacantUnitsDB({
	userId,
	status = "Vacant",
	limit = 50,
	session,
}: {
	userId: string;
	status?: "Vacant" | "Occupied";
	limit?: number;
	session?: ClientSession;
}): Promise<
	(IUnitPopulated & { property: { _id: string; name: string } | null })[]
> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const results = await Unit.aggregate<
			IUnit & { property?: { _id: string; name: string } | null }
		>(
			[
				{ $match: { userId, status: status as IUnitStatus } },
				{ $sort: { createdAt: -1 } },
				{ $limit: Math.min(limit, MAX_LIMIT) },
				{
					$lookup: {
						from: "properties",
						let: { propertyIdStr: "$propertyId" },
						pipeline: [
							{
								$match: {
									$expr: {
										$eq: [
											{ $toString: "$_id" },
											"$$propertyIdStr",
										],
									},
								},
							},
							{ $project: { _id: 1, name: 1 } },
						],
						as: "_propertyLookup",
					},
				},
				{
					$addFields: {
						property: {
							$let: {
								vars: {
									p: {
										$arrayElemAt: ["$_propertyLookup", 0],
									},
								},
								in: {
									$cond: [
										{ $ifNull: ["$$p", false] },
										{
											_id: { $toString: "$$p._id" },
											name: "$$p.name",
										},
										null,
									],
								},
							},
						},
					},
				},
				{ $project: { _propertyLookup: 0 } },
			],
			{ session },
		);

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getVacantUnitsDB",
			success: "true",
		});

		if (results.length === 0) return [];

		const settled = await Promise.allSettled(
			results.map(async (r) => ({
				...r,
				tenant: await resolveTenant(r.tenant),
				property: r.property ?? null,
			})),
		);
		return settled
			.filter(
				(
					s,
				): s is PromiseFulfilledResult<
					IUnitPopulated & {
						property: { _id: string; name: string } | null;
					}
				> => s.status === "fulfilled",
			)
			.map((s) => s.value);
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getVacantUnitsDB",
			success: "false",
		});
		return [];
	}
}

export async function getUnitsByIdsDB({
	ids,
	userId,
	session,
}: {
	ids: string[];
	userId?: string;
	session?: ClientSession;
}): Promise<IUnit[]> {
	if (ids.length === 0) return [];
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
		const match: Record<string, unknown> = { _id: { $in: objectIds } };
		if (userId) match.userId = userId;

		const result = await Unit.aggregate<IUnit>([{ $match: match }], {
			session,
		});
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUnitsByIdsDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUnitsByIdsDB",
			success: "false",
		});
		return [];
	}
}

export * from "./tenant";
export * from "./types";
