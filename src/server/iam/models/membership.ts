import mongoose, { type ClientSession } from "mongoose";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../../models/utils";
import type {
	IIamGroupMembership,
	IIamGroupMembershipCreateInput,
} from "./types";

const collectionName = "iamgroupmemberships";

const schema = new mongoose.Schema<IIamGroupMembership>(
	{
		groupId: { type: mongoose.Types.ObjectId, required: true },
		principalType: {
			type: String,
			enum: ["user", "operator"],
			required: true,
		},
		principalId: { type: mongoose.Types.ObjectId, required: true },
		orgId: {
			type: mongoose.Types.ObjectId,
			required: false,
			default: null,
		},
	},
	{ timestamps: { createdAt: true, updatedAt: false } },
);

// The hot path: resolve a principal's groups. Also enforce that the same
// principal cannot join the same group twice within the same org scope.
schema.index({ principalType: 1, principalId: 1, orgId: 1 });
schema.index(
	{ groupId: 1, principalType: 1, principalId: 1, orgId: 1 },
	{ unique: true },
);

export const IamGroupMembership: mongoose.Model<IIamGroupMembership> =
	(mongoose.models[collectionName] as
		| mongoose.Model<IIamGroupMembership>
		| undefined) ??
	mongoose.model<IIamGroupMembership>(collectionName, schema);

function toObjectId(
	value: mongoose.Types.ObjectId | string,
): mongoose.Types.ObjectId {
	return typeof value === "string"
		? new mongoose.Types.ObjectId(value)
		: value;
}

function toObjectIdOrNull(
	value: mongoose.Types.ObjectId | string | null | undefined,
): mongoose.Types.ObjectId | null {
	if (value === null || value === undefined) return null;
	return toObjectId(value);
}

export async function addMembershipDB({
	payload,
	session,
}: {
	payload: IIamGroupMembershipCreateInput;
	session?: ClientSession;
}): Promise<IIamGroupMembership | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const filter = {
			groupId: toObjectId(payload.groupId),
			principalType: payload.principalType,
			principalId: toObjectId(payload.principalId),
			orgId: toObjectIdOrNull(payload.orgId),
		};
		// Idempotent: re-adding an existing membership is a no-op that returns the
		// existing row rather than tripping the unique index.
		const result = await IamGroupMembership.findOneAndUpdate(
			filter,
			{ $setOnInsert: filter },
			{ upsert: true, returnDocument: "after", session },
		);
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "addMembershipDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "addMembershipDB",
			success: "false",
		});
		return null;
	}
}

export async function removeMembershipDB({
	groupId,
	principalType,
	principalId,
	orgId,
	session,
}: {
	groupId: string;
	principalType: "user" | "operator";
	principalId: string;
	orgId?: string | null;
	session?: ClientSession;
}): Promise<boolean> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await IamGroupMembership.deleteOne(
			{
				groupId: toObjectId(groupId),
				principalType,
				principalId: toObjectId(principalId),
				orgId: toObjectIdOrNull(orgId),
			},
			{ session },
		);
		timer({
			operation: IOperationType.Delete,
			collection: collectionName,
			method: "removeMembershipDB",
			success: "true",
		});
		return result.deletedCount > 0;
	} catch {
		timer({
			operation: IOperationType.Delete,
			collection: collectionName,
			method: "removeMembershipDB",
			success: "false",
		});
		return false;
	}
}

/**
 * Remove EVERY membership a principal holds within an org scope (system and
 * custom groups). Used when a member leaves/is removed from an org so no stale
 * group grants survive. Returns the number of rows deleted (0 on failure).
 */
export async function removeAllMembershipsForPrincipalDB({
	principalType,
	principalId,
	orgId,
	session,
}: {
	principalType: "user" | "operator";
	principalId: string;
	orgId?: string | null;
	session?: ClientSession;
}): Promise<number> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await IamGroupMembership.deleteMany(
			{
				principalType,
				principalId: toObjectId(principalId),
				orgId: toObjectIdOrNull(orgId),
			},
			{ session },
		);
		timer({
			operation: IOperationType.Delete,
			collection: collectionName,
			method: "removeAllMembershipsForPrincipalDB",
			success: "true",
		});
		return result.deletedCount ?? 0;
	} catch {
		timer({
			operation: IOperationType.Delete,
			collection: collectionName,
			method: "removeAllMembershipsForPrincipalDB",
			success: "false",
		});
		return 0;
	}
}

export async function getMembershipsForGroupDB({
	groupId,
	session,
}: {
	groupId: string;
	session?: ClientSession;
}): Promise<IIamGroupMembership[]> {
	try {
		return await IamGroupMembership.find(
			{ groupId: toObjectId(groupId) },
			null,
			{ session },
		).lean<IIamGroupMembership[]>();
	} catch {
		return [];
	}
}

export async function listMembershipsForOrgDB({
	orgId,
	session,
}: {
	orgId: string;
	session?: ClientSession;
}): Promise<IIamGroupMembership[]> {
	try {
		return await IamGroupMembership.find(
			{ orgId: toObjectIdOrNull(orgId) },
			null,
			{ session },
		).lean<IIamGroupMembership[]>();
	} catch {
		return [];
	}
}

export async function getMembershipsForPrincipalDB({
	principalType,
	principalId,
	orgId,
	session,
}: {
	principalType: "user" | "operator";
	principalId: string;
	orgId?: string | null;
	session?: ClientSession;
}): Promise<IIamGroupMembership[]> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await IamGroupMembership.find(
			{
				principalType,
				principalId: toObjectId(principalId),
				orgId: toObjectIdOrNull(orgId),
			},
			null,
			{ session },
		).lean<IIamGroupMembership[]>();
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getMembershipsForPrincipalDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getMembershipsForPrincipalDB",
			success: "false",
		});
		return [];
	}
}
