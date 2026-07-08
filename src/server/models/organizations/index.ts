import mongoose, { type ClientSession } from "mongoose";
import {
	ErrResourceAlreadyExist,
	ErrResourceNotFound,
	MAX_LIMIT,
} from "../../constants";
import { s3GetFileLink } from "../../helpers";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../utils";
import {
	type IOrganization,
	type IOrganizationCreateInput,
	IOrganizationRole,
} from "./types";

const collectionName = "organizations";

const schema = new mongoose.Schema<IOrganization>(
	{
		ownerId: {
			type: mongoose.Types.ObjectId,
			required: true,
		},
		deleted: {
			type: Boolean,
			default: false,
			select: false,
		},
		name: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
		},
		description: {
			type: String,
			required: true,
		},
		logo: {
			type: String,
			required: false,
		},
		website: {
			type: String,
			required: false,
		},
		x: {
			type: String,
			required: false,
		},
		instagram: {
			type: String,
			required: false,
		},
		telegram: {
			type: String,
			required: false,
		},
		members: [
			{
				memberId: {
					type: mongoose.Types.ObjectId,
					required: true,
				},
				permission: {
					type: String,
					enum: IOrganizationRole,
					required: true,
				},
			},
		],
		invites: [
			{
				email: { type: String, required: true, lowercase: true },
				token: { type: String, required: true },
				role: {
					type: String,
					enum: IOrganizationRole,
					required: true,
				},
				invitedById: {
					type: mongoose.Types.ObjectId,
					required: true,
				},
				expiresAt: { type: Date, required: true },
				createdAt: { type: Date, default: Date.now },
			},
		],
	},
	{ timestamps: true },
);

schema.index({ ownerId: 1, deleted: 1 });
schema.index({ "members.memberId": 1 });

schema.pre("aggregate", function () {
	this.pipeline().unshift({ $match: { deleted: false } });
	this.pipeline().push({ $addFields: { id: { $toString: "$_id" } } });
	this.pipeline().push({ $project: { __v: 0, deleted: 0 } });
});

schema.post("aggregate", async (documents: IOrganization[]) => {
	const expiresIn = 60 * 60 * 24;
	await Promise.allSettled(
		documents.map(async (doc) => {
			if (!doc.logo) return;
			doc.logo =
				(await s3GetFileLink({
					fileName: doc.logo,
					expiresInSeconds: expiresIn,
				})) ?? doc.logo;
		}),
	);
});

export const Organization: mongoose.Model<IOrganization> =
	(mongoose.models[collectionName] as
		| mongoose.Model<IOrganization>
		| undefined) ?? mongoose.model<IOrganization>(collectionName, schema);

export async function createOrganizationDB({
	payload,
	session,
}: {
	payload: IOrganizationCreateInput;
	session?: ClientSession;
}): Promise<IOrganization | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await Organization.create([payload], { session }).then(
			(res) => res[0],
		);
		if (!result) throw ErrResourceAlreadyExist;

		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createOrganizationDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createOrganizationDB",
			success: "false",
		});
		return null;
	}
}

export async function updateOrganizationDB({
	id,
	payload,
	session,
}: {
	id: string;
	payload: IOrganizationCreateInput;
	session?: ClientSession;
}): Promise<IOrganization | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await Organization.findOneAndUpdate(
			{
				_id: new mongoose.Types.ObjectId(id),
				deleted: false,
			},
			{ ...payload },
			{
				returnDocument: "after",
				session,
			},
		);
		if (!result) throw ErrResourceNotFound;

		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateOrganizationDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateOrganizationDB",
			success: "false",
		});
		return null;
	}
}

export async function deleteOrganizationDB({
	id,
	session,
}: {
	id: string;
	session?: ClientSession;
}): Promise<IOrganization | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await Organization.findOneAndUpdate(
			{
				_id: new mongoose.Types.ObjectId(id),
				deleted: false,
			},
			{
				deleted: true,
			},
			{
				session,
			},
		);
		if (!result) throw ErrResourceNotFound;

		timer({
			operation: IOperationType.Delete,
			collection: collectionName,
			method: "deleteOrganizationDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Delete,
			collection: collectionName,
			method: "deleteOrganizationDB",
			success: "false",
		});
		return null;
	}
}

export async function updateOrganizationMembersDB({
	id,
	members,
	session,
}: {
	id: string;
	members: IOrganization["members"];
	session?: ClientSession;
}): Promise<IOrganization | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await Organization.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), deleted: false },
			{ members },
			{ returnDocument: "after", session },
		);
		if (!result) throw ErrResourceNotFound;
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateOrganizationMembersDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateOrganizationMembersDB",
			success: "false",
		});
		return null;
	}
}

export async function removeOrganizationMembersDB({
	id,
	memberId: _memberId,
	session,
}: {
	id: string;
	memberId: string;
	session?: ClientSession;
}): Promise<IOrganization | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const orgId = new mongoose.Types.ObjectId(id);
		const memberId = new mongoose.Types.ObjectId(_memberId);
		// `members` is an array of `{ memberId, permission }` subdocuments, so
		// the pull condition must match the subdocument's `memberId` field. A
		// bare `{ $in: [memberId] }` compares each whole subdocument against an
		// ObjectId and never matches (see `removeMemberDB` for the same shape).
		const result = await Organization.findOneAndUpdate(
			{ _id: orgId, deleted: false },
			{ $pull: { members: { memberId } } },
			{ returnDocument: "after", session },
		);
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "removeOrganizationMembersDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "removeOrganizationMembersDB",
			success: "false",
		});
		return null;
	}
}

export async function getOrganizationsDB({
	name,
	offset,
	limit,
	sortBy = "desc",
	session,
}: {
	name?: string;
	offset: number;
	limit: number;
	sortBy?: "asc" | "desc";
	session?: ClientSession;
}): Promise<IOrganization[]> {
	const timer = databaseResponseTimeHistogram.startTimer();
	const safeLimit = Math.min(limit, MAX_LIMIT);
	const safeName = (name ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	try {
		const result = await Organization.aggregate<IOrganization>(
			[
				{
					$match: {
						name: { $regex: safeName, $options: "i" },
					},
				},
				{
					$sort: {
						createdAt: sortBy === "asc" ? 1 : -1,
					},
				},
				{
					$skip: offset,
				},
				{
					$limit: safeLimit,
				},
			],
			{ session },
		);

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationsDB",
			success: "true",
		});

		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationsDB",
			success: "false",
		});
		return [];
	}
}

export async function getOrganizationByIdDB({
	id,
	session,
}: {
	id: string;
	session?: ClientSession;
}): Promise<IOrganization | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = (
			await Organization.aggregate<IOrganization>(
				[
					{
						$match: {
							_id: new mongoose.Types.ObjectId(id),
						},
					},
					{
						$limit: 1,
					},
				],
				{ session },
			)
		)?.at(0);

		if (!result) throw ErrResourceNotFound;

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationByIdDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationByIdDB",
			success: "false",
		});
		return null;
	}
}

export async function getOrganizationByNameDB({
	name,
	session,
}: {
	name: string;
	session?: ClientSession;
}): Promise<IOrganization | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	const safeName = (name ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	try {
		const result = (
			await Organization.aggregate<IOrganization>(
				[
					{
						$match: {
							name: { $regex: safeName, $options: "i" },
						},
					},
					{
						$limit: 1,
					},
				],
				{ session },
			)
		)?.at(0);
		if (!result) throw ErrResourceNotFound;

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationByNameDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationByNameDB",
			success: "false",
		});
		return null;
	}
}

export async function getOrganizationsByIdsDB({
	ids,
	offset,
	limit,
	session,
}: {
	ids: string[];
	offset: number;
	limit: number;
	session?: ClientSession;
}): Promise<IOrganization[]> {
	const timer = databaseResponseTimeHistogram.startTimer();
	const safeLimit = Math.min(limit, MAX_LIMIT);

	try {
		const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
		const result = await Organization.aggregate<IOrganization>(
			[
				{
					$match: {
						_id: { $in: objectIds },
					},
				},
				{
					$skip: offset,
				},
				{
					$limit: safeLimit,
				},
			],
			{ session },
		);
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationsByIdsDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationsByIdsDB",
			success: "false",
		});
		return [];
	}
}

export async function getOrganizationsCountDB({
	session,
}: {
	session?: ClientSession;
}): Promise<number> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await Organization.aggregate<{ count: number }>(
			[{ $count: "count" }],
			{ session },
		);
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationsCountDB",
			success: "true",
		});
		return result[0]?.count ?? 0;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationsCountDB",
			success: "false",
		});
		return 0;
	}
}

export async function getOrganizationsForMemberDB({
	userId,
	session,
}: {
	userId: string;
	session?: ClientSession;
}): Promise<IOrganization[]> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const userObjectId = new mongoose.Types.ObjectId(userId);
		const result = await Organization.aggregate<IOrganization>(
			[
				{
					$match: {
						$or: [
							{ ownerId: userObjectId },
							{ "members.memberId": userObjectId },
						],
					},
				},
				{ $sort: { createdAt: -1 } },
			],
			{ session },
		);
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationsForMemberDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationsForMemberDB",
			success: "false",
		});
		return [];
	}
}

export async function findOrganizationByInviteTokenDB({
	token,
	session,
}: {
	token: string;
	session?: ClientSession;
}): Promise<IOrganization | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await Organization.findOne(
			{ "invites.token": token, deleted: false },
			null,
			{ session },
		).lean<IOrganization>();
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "findOrganizationByInviteTokenDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "findOrganizationByInviteTokenDB",
			success: "false",
		});
		return null;
	}
}

export async function addOrganizationInviteDB({
	id,
	invite,
	session,
}: {
	id: string;
	invite: {
		email: string;
		token: string;
		role: IOrganizationRole;
		invitedById: mongoose.Types.ObjectId;
		expiresAt: Date;
	};
	session?: ClientSession;
}): Promise<IOrganization | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await Organization.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), deleted: false },
			{
				$push: {
					invites: { ...invite, createdAt: new Date() },
				},
			},
			{ returnDocument: "after", session },
		);
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "addOrganizationInviteDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "addOrganizationInviteDB",
			success: "false",
		});
		return null;
	}
}

export async function consumeInviteAndAddMemberDB({
	orgId,
	token,
	memberId,
	session,
}: {
	orgId: string;
	token: string;
	memberId: mongoose.Types.ObjectId;
	session?: ClientSession;
}): Promise<IOrganization | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const org = await Organization.findOne(
			{
				_id: new mongoose.Types.ObjectId(orgId),
				deleted: false,
				"invites.token": token,
			},
			null,
			{ session },
		);
		if (!org) return null;
		const invite = org.invites?.find((i) => i.token === token);
		if (!invite || invite.expiresAt < new Date()) return null;
		const already = org.members?.some(
			(m) => m.memberId.toString() === memberId.toString(),
		);
		if (!already) {
			org.members = [
				...(org.members ?? []),
				{ memberId, permission: invite.role },
			];
		}
		org.invites = (org.invites ?? []).filter((i) => i.token !== token);
		await org.save({ session });
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "consumeInviteAndAddMemberDB",
			success: "true",
		});
		return org;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "consumeInviteAndAddMemberDB",
			success: "false",
		});
		return null;
	}
}

export async function revokeInviteDB({
	orgId,
	token,
	session,
}: {
	orgId: string;
	token: string;
	session?: ClientSession;
}): Promise<boolean> {
	try {
		const result = await Organization.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(orgId) },
			{ $pull: { invites: { token } } },
			{ session },
		);
		return !!result;
	} catch {
		return false;
	}
}

export async function setMemberRoleDB({
	orgId,
	memberId,
	role,
	session,
}: {
	orgId: string;
	memberId: string;
	role: IOrganizationRole;
	session?: ClientSession;
}): Promise<IOrganization | null> {
	try {
		const result = await Organization.findOneAndUpdate(
			{
				_id: new mongoose.Types.ObjectId(orgId),
				"members.memberId": new mongoose.Types.ObjectId(memberId),
			},
			{ $set: { "members.$.permission": role } },
			{ returnDocument: "after", session },
		);
		return result;
	} catch {
		return null;
	}
}

export async function removeMemberDB({
	orgId,
	memberId,
	session,
}: {
	orgId: string;
	memberId: string;
	session?: ClientSession;
}): Promise<IOrganization | null> {
	try {
		const result = await Organization.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(orgId) },
			{
				$pull: {
					members: {
						memberId: new mongoose.Types.ObjectId(memberId),
					},
				},
			},
			{ returnDocument: "after", session },
		);
		return result;
	} catch {
		return null;
	}
}

export async function getOrganizationMembersDB({
	id,
	session,
}: {
	id: string;
	session?: ClientSession;
}): Promise<{ members: IOrganization["members"] } | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = (
			await Organization.aggregate<{
				members: IOrganization["members"];
			}>(
				[
					{
						$match: {
							_id: new mongoose.Types.ObjectId(id),
						},
					},
					{
						$project: {
							members: 1,
						},
					},
				],
				{ session },
			)
		)?.at(0);

		if (!result) throw ErrResourceNotFound;
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationMembersDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getOrganizationMembersDB",
			success: "false",
		});
		return null;
	}
}

/**
 * Platform operator suspend/reactivate: toggle `deleted` in EITHER direction.
 * Distinct from {@link deleteOrganizationDB}, which only matches non-deleted
 * docs (so it cannot reactivate). Must run behind a platform-plane authorize().
 */
export async function setOrganizationDeletedDB({
	id,
	deleted,
	session,
}: {
	id: string;
	deleted: boolean;
	session?: ClientSession;
}): Promise<IOrganization | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await Organization.findByIdAndUpdate(
			new mongoose.Types.ObjectId(id),
			{ deleted },
			{ returnDocument: "after" },
		);
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "setOrganizationDeletedDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "setOrganizationDeletedDB",
			success: "false",
		});
		return null;
	}
}

export * from "./types";
