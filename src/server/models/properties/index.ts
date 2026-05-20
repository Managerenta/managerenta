import mongoose, { type ClientSession } from "mongoose";
import { ErrPropertyNotFound, MAX_LIMIT } from "../../constants";
import { s3GetFileLink } from "../../helpers";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../utils";
import type {
	IProperty,
	IPropertyCreateInput,
	IPropertyUpdateInput,
} from "./types";

const collectionName = "properties";

const schema = new mongoose.Schema<IProperty>(
	{
		name: { type: String, required: true },
		address: { type: String, required: true },
		type: {
			type: String,
			required: true,
			enum: [
				"Apartment",
				"House",
				"Commercial",
				"Land",
				"Studio",
				"Duplex",
				"Highrise",
				"Bungalow",
			],
		},
		totalUnits: { type: Number, required: true, min: 0, default: 0 },
		monthlyRent: { type: Number, required: false, default: 0 },
		description: { type: String, required: false },
		image: { type: String, required: false },
		userId: { type: String, required: true },
		deleted: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

schema.index({ userId: 1, deleted: 1 });
schema.index({ userId: 1, createdAt: -1 });

schema.pre("aggregate", function () {
	this.pipeline().unshift({ $match: { deleted: false } });
	this.pipeline().push({
		$addFields: {
			id: { $toString: "$_id" },
			monthlyRent: { $ifNull: ["$monthlyRent", 0] },
		},
	});
	this.pipeline().push({ $project: { __v: 0, deleted: 0 } });
});

schema.post("aggregate", async (documents: IProperty[]) => {
	await Promise.allSettled(
		documents.map(async (doc) => {
			if (!doc.image) return;
			doc.image =
				(await s3GetFileLink({ fileName: doc.image })) ?? doc.image;
		}),
	);
});

export const Property = mongoose.model<IProperty>(collectionName, schema);

export async function createPropertyDB({
	payload,
	session,
}: {
	payload: IPropertyCreateInput;
	session?: ClientSession;
}): Promise<IProperty | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const doc = new Property(payload);
		const result = await doc.save({ session });
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createPropertyDB",
			success: "true",
		});
		return { ...result.toObject(), id: result.id };
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createPropertyDB",
			success: "false",
		});
		return null;
	}
}

export async function getPropertiesDB({
	userId,
	limit = 20,
	offset = 0,
	session,
}: {
	userId: string;
	limit?: number;
	offset?: number;
	session?: ClientSession;
}): Promise<{ properties: IProperty[]; total: number }> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const safeLimit = Math.min(limit, MAX_LIMIT);

		const [propertiesResult, countResult] = await Promise.allSettled([
			Property.aggregate<IProperty>(
				[
					{ $match: { userId } },
					{ $sort: { createdAt: -1 } },
					{ $skip: offset },
					{ $limit: safeLimit },
				],
				{ session },
			),
			Property.aggregate<{ total: number }>(
				[{ $match: { userId } }, { $count: "total" }],
				{ session },
			),
		]);

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getPropertiesDB",
			success: "true",
		});

		const results =
			propertiesResult.status === "fulfilled"
				? propertiesResult.value
				: [];
		const total =
			countResult.status === "fulfilled"
				? (countResult.value[0]?.total ?? 0)
				: 0;

		const propertyIds = results.map((r) => r.id);
		const Unit = mongoose.models.units;
		const occupiedMap = new Map<string, number>();
		if (Unit && propertyIds.length > 0) {
			const occupiedCounts = await Unit.aggregate([
				{
					$match: {
						propertyId: { $in: propertyIds },
						status: "Occupied",
						deleted: false,
					},
				},
				{ $group: { _id: "$propertyId", count: { $sum: 1 } } },
			]);
			for (const row of occupiedCounts)
				occupiedMap.set(row._id, row.count);
		}

		const properties = results.map((r) => ({
			...r,
			occupied: occupiedMap.get(r.id) ?? 0,
		}));

		return { properties, total };
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getPropertiesDB",
			success: "false",
		});
		return { properties: [], total: 0 };
	}
}

export async function getPropertyByIdDB({
	id,
	userId,
	session,
}: {
	id: string;
	userId: string;
	session?: ClientSession;
}): Promise<IProperty | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result =
			(
				await Property.aggregate<IProperty>(
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
			).at(0) ?? null;

		if (!result) throw ErrPropertyNotFound;

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getPropertyByIdDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getPropertyByIdDB",
			success: "false",
		});
		return null;
	}
}

export async function updatePropertyDB({
	id,
	userId,
	payload,
	session,
}: {
	id: string;
	userId: string;
	payload: IPropertyUpdateInput;
	session?: ClientSession;
}): Promise<IProperty | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await Property.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), userId, deleted: false },
			{ $set: payload },
			{ new: true, session },
		);

		if (!result) throw ErrPropertyNotFound;

		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updatePropertyDB",
			success: "true",
		});

		const obj = { ...result.toObject(), id: result.id };
		if (obj.image) {
			obj.image =
				(await s3GetFileLink({ fileName: obj.image })) ?? obj.image;
		}
		return obj;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updatePropertyDB",
			success: "false",
		});
		return null;
	}
}

export async function incrementPropertyTotalUnitsDB({
	id,
	userId,
	session,
}: {
	id: string;
	userId: string;
	session?: ClientSession;
}): Promise<void> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		await Property.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), userId, deleted: false },
			{ $inc: { totalUnits: 1 } },
			{ session },
		);
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "incrementPropertyTotalUnitsDB",
			success: "true",
		});
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "incrementPropertyTotalUnitsDB",
			success: "false",
		});
	}
}

export async function getPropertyStatsDB({
	userId,
}: {
	userId: string;
}): Promise<{
	totalProperties: number;
	totalUnits: number;
	totalMonthlyRent: number;
}> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const results = await Property.aggregate([
			{ $match: { userId } },
			{
				$group: {
					_id: null,
					totalProperties: { $sum: 1 },
					totalUnits: { $sum: "$totalUnits" },
					totalMonthlyRent: {
						$sum: { $ifNull: ["$monthlyRent", 0] },
					},
				},
			},
		]);

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getPropertyStatsDB",
			success: "true",
		});

		const row = results[0];
		return {
			totalProperties: row?.totalProperties ?? 0,
			totalUnits: row?.totalUnits ?? 0,
			totalMonthlyRent: row?.totalMonthlyRent ?? 0,
		};
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getPropertyStatsDB",
			success: "false",
		});
		return { totalProperties: 0, totalUnits: 0, totalMonthlyRent: 0 };
	}
}

export async function getPropertiesByIdsDB({
	ids,
	userId,
	session,
}: {
	ids: string[];
	userId?: string;
	session?: ClientSession;
}): Promise<IProperty[]> {
	if (ids.length === 0) return [];
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
		const match: Record<string, unknown> = { _id: { $in: objectIds } };
		if (userId) match.userId = userId;

		const result = await Property.aggregate<IProperty>(
			[{ $match: match }],
			{
				session,
			},
		);
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getPropertiesByIdsDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getPropertiesByIdsDB",
			success: "false",
		});
		return [];
	}
}

export * from "./types";
