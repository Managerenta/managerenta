import mongoose, { type ClientSession } from "mongoose";
import { ErrTenantNotFound, MAX_LIMIT } from "../../constants";
import { s3GetFileLink } from "../../helpers";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../utils";
import { Transaction } from "./transactions";
import type { ITenant, ITenantCreateInput } from "./types";

const collectionName = "tenants";

const tenantSchema = new mongoose.Schema<ITenant>(
	{
		name: { type: String, required: true },
		phone: { type: String, required: true },
		email: { type: String, required: true },
		avatar: { type: String, required: false },
		unitId: { type: String, required: true },
		propertyId: { type: String, required: true },
		userId: { type: String, required: true },
		moveInDate: { type: Date, required: true },
		leaseExpiry: { type: Date, required: false },
		rentDueDay: {
			type: Number,
			required: false,
			default: 1,
			min: 1,
			max: 28,
		},
		status: {
			type: String,
			enum: ["Active", "Inactive"],
			default: "Active",
		},
		deleted: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

tenantSchema.index({ userId: 1, status: 1 });
tenantSchema.index({ userId: 1, deleted: 1 });
tenantSchema.index({ unitId: 1 });
tenantSchema.index({ propertyId: 1 });

tenantSchema.pre("aggregate", function () {
	this.pipeline().unshift({ $match: { deleted: false } });
	this.pipeline().push({ $addFields: { id: { $toString: "$_id" } } });
	this.pipeline().push({ $project: { __v: 0, deleted: 0 } });
});

tenantSchema.post("aggregate", async (documents: ITenant[]) => {
	await Promise.allSettled(
		documents.map(async (doc) => {
			if (!doc.avatar) return;
			doc.avatar =
				(await s3GetFileLink({ fileName: doc.avatar })) ?? doc.avatar;
		}),
	);
});

export const Tenant: mongoose.Model<ITenant> =
	(mongoose.models[collectionName] as mongoose.Model<ITenant> | undefined) ??
	mongoose.model<ITenant>(collectionName, tenantSchema);

export async function createTenantDB({
	payload,
	session,
}: {
	payload: ITenantCreateInput;
	session?: ClientSession;
}): Promise<ITenant | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const doc = new Tenant(payload);
		const result = await doc.save({ session });
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createTenantDB",
			success: "true",
		});
		const obj = { ...result.toObject(), id: result.id };
		if (obj.avatar) {
			obj.avatar =
				(await s3GetFileLink({ fileName: obj.avatar })) ?? obj.avatar;
		}
		return obj;
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createTenantDB",
			success: "false",
		});
		return null;
	}
}

export async function getTenantsDB({
	userId,
	limit = 12,
	offset = 0,
	status,
	search,
	sort = "name",
	session,
}: {
	userId: string;
	limit?: number;
	offset?: number;
	status?: "Active" | "Inactive" | "all";
	search?: string;
	sort?: string;
	session?: ClientSession;
}): Promise<{ tenants: ITenant[]; total: number }> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const matchFilter: Record<string, unknown> = { userId };
		if (status && status !== "all") matchFilter.status = status;
		if (search?.trim()) {
			matchFilter.$or = [
				{ name: { $regex: search.trim(), $options: "i" } },
				{ email: { $regex: search.trim(), $options: "i" } },
				{ phone: { $regex: search.trim(), $options: "i" } },
			];
		}

		const safeLimit = Math.min(limit, MAX_LIMIT);
		const sortKey = sort === "name" ? "name" : "createdAt";
		const sortDir: 1 | -1 = sort === "name" ? 1 : -1;

		const [tenantsResult, countResult] = await Promise.allSettled([
			Tenant.aggregate<ITenant>(
				[
					{ $match: matchFilter },
					{ $sort: { [sortKey]: sortDir } },
					{ $skip: offset },
					{ $limit: safeLimit },
				],
				{ session },
			),
			Tenant.aggregate<{ total: number }>(
				[{ $match: matchFilter }, { $count: "total" }],
				{ session },
			),
		]);

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getTenantsDB",
			success: "true",
		});

		const tenants =
			tenantsResult.status === "fulfilled" ? tenantsResult.value : [];
		const total =
			countResult.status === "fulfilled"
				? (countResult.value[0]?.total ?? 0)
				: 0;

		return { tenants, total };
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getTenantsDB",
			success: "false",
		});
		return { tenants: [], total: 0 };
	}
}

export async function getTenantByIdDB({
	id,
	userId,
	session,
}: {
	id: string;
	userId: string;
	session?: ClientSession;
}): Promise<ITenant | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result =
			(
				await Tenant.aggregate<ITenant>(
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

		if (!result) throw ErrTenantNotFound;

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getTenantByIdDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getTenantByIdDB",
			success: "false",
		});
		return null;
	}
}

export async function updateTenantDB({
	id,
	userId,
	payload,
	session,
}: {
	id: string;
	userId: string;
	payload: Partial<
		Pick<
			ITenant,
			| "name"
			| "phone"
			| "email"
			| "moveInDate"
			| "leaseExpiry"
			| "rentDueDay"
			| "avatar"
		>
	>;
	session?: ClientSession;
}): Promise<ITenant | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await Tenant.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), userId, deleted: false },
			{ $set: payload },
			{ returnDocument: "after", session },
		);
		if (!result) throw ErrTenantNotFound;

		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateTenantDB",
			success: "true",
		});
		const obj = { ...result.toObject(), id: result.id };
		if (obj.avatar) {
			obj.avatar =
				(await s3GetFileLink({ fileName: obj.avatar })) ?? obj.avatar;
		}
		return obj;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateTenantDB",
			success: "false",
		});
		return null;
	}
}

export async function deleteTenantDB({
	id,
	userId,
	session,
}: {
	id: string;
	userId: string;
	session?: ClientSession;
}): Promise<{ unitId: string; name: string } | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await Tenant.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), userId, deleted: false },
			{ $set: { deleted: true } },
			{ returnDocument: "after", session },
		);
		if (!result) throw ErrTenantNotFound;

		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "deleteTenantDB",
			success: "true",
		});
		return { unitId: result.unitId, name: result.name };
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "deleteTenantDB",
			success: "false",
		});
		return null;
	}
}

export async function getTenantsByUnitIdDB({
	unitId,
	session,
}: {
	unitId: string;
	session?: ClientSession;
}): Promise<ITenant[]> {
	const results = await Tenant.aggregate<ITenant>([{ $match: { unitId } }], {
		session,
	});
	return results;
}

export async function getTenantStatsDB({
	userId,
}: {
	userId: string;
}): Promise<{
	totalTenants: number;
	activeTenants: number;
	expiringLeases: number;
	overduePayments: number;
}> {
	const now = new Date();
	const thirtyDaysFromNow = new Date(
		now.getTime() + 30 * 24 * 60 * 60 * 1000,
	);
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const [totalResult, activeResult, expiringResult, activeTenantDocsResult] =
		await Promise.allSettled([
			Tenant.aggregate<{ count: number }>([
				{ $match: { userId } },
				{ $count: "count" },
			]),
			Tenant.aggregate<{ count: number }>([
				{ $match: { userId, status: "Active" } },
				{ $count: "count" },
			]),
			Tenant.aggregate<{ count: number }>([
				{
					$match: {
						userId,
						status: "Active",
						leaseExpiry: { $gte: now, $lte: thirtyDaysFromNow },
					},
				},
				{ $count: "count" },
			]),
			Tenant.aggregate<{
				_id: mongoose.Types.ObjectId;
				rentDueDay: number;
			}>([
				{ $match: { userId, status: "Active" } },
				{ $project: { rentDueDay: 1 } },
			]),
		]);

	const totalTenants =
		totalResult.status === "fulfilled"
			? (totalResult.value[0]?.count ?? 0)
			: 0;
	const activeTenants =
		activeResult.status === "fulfilled"
			? (activeResult.value[0]?.count ?? 0)
			: 0;
	const expiringLeases =
		expiringResult.status === "fulfilled"
			? (expiringResult.value[0]?.count ?? 0)
			: 0;
	const activeTenantDocs =
		activeTenantDocsResult.status === "fulfilled"
			? activeTenantDocsResult.value
			: [];

	let overduePayments = 0;
	if (activeTenantDocs.length > 0) {
		const overdueChecks = await Promise.allSettled(
			activeTenantDocs.map(async (t) => {
				const dueDay = t.rentDueDay ?? 1;
				const dueDate = new Date(
					now.getFullYear(),
					now.getMonth(),
					dueDay,
				);
				if (now <= dueDate) return false;
				const paid =
					(
						await Transaction.aggregate([
							{
								$match: {
									tenantId: t._id.toString(),
									amountType: "credit",
									type: "rent",
									date: { $gte: startOfMonth },
								},
							},
							{ $limit: 1 },
							{ $count: "count" },
						])
					)[0]?.count > 0;
				return !paid;
			}),
		);
		overduePayments = overdueChecks.filter(
			(r) => r.status === "fulfilled" && r.value === true,
		).length;
	}

	return { totalTenants, activeTenants, expiringLeases, overduePayments };
}

export async function getTenantIdsByPropertyIdDB({
	propertyId,
	userId,
	session,
}: {
	propertyId: string;
	userId: string;
	session?: ClientSession;
}): Promise<string[]> {
	try {
		const docs = await Tenant.aggregate<{ _id: mongoose.Types.ObjectId }>(
			[{ $match: { propertyId, userId } }, { $project: { _id: 1 } }],
			{ session },
		);
		return docs.map((d) => d._id.toString());
	} catch {
		return [];
	}
}

export async function getTenantsByIdsDB({
	ids,
	userId,
	session,
}: {
	ids: string[];
	userId?: string;
	session?: ClientSession;
}): Promise<ITenant[]> {
	if (ids.length === 0) return [];
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
		const match: Record<string, unknown> = { _id: { $in: objectIds } };
		if (userId) match.userId = userId;

		const result = await Tenant.aggregate<ITenant>([{ $match: match }], {
			session,
		});
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getTenantsByIdsDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getTenantsByIdsDB",
			success: "false",
		});
		return [];
	}
}

export * from "./transactions";
export * from "./types";
