import mongoose, { type ClientSession } from "mongoose";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../../models/utils";
import type { Plane } from "../types";
import type { IIamGroup, IIamGroupCreateInput } from "./types";

const collectionName = "iamgroups";

const schema = new mongoose.Schema<IIamGroup>(
	{
		name: { type: String, required: true },
		plane: { type: String, enum: ["platform", "org"], required: true },
		orgId: {
			type: mongoose.Types.ObjectId,
			required: false,
			default: null,
		},
		managedBy: {
			type: String,
			enum: ["system", "customer"],
			required: true,
		},
		attachedPolicyIds: {
			type: [mongoose.Types.ObjectId],
			required: true,
			default: [],
		},
	},
	{ timestamps: true },
);

schema.index({ plane: 1, orgId: 1, name: 1 }, { unique: true });

export const IamGroup: mongoose.Model<IIamGroup> =
	(mongoose.models[collectionName] as
		| mongoose.Model<IIamGroup>
		| undefined) ?? mongoose.model<IIamGroup>(collectionName, schema);

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

export async function createIamGroupDB({
	payload,
	session,
}: {
	payload: IIamGroupCreateInput;
	session?: ClientSession;
}): Promise<IIamGroup | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await IamGroup.create(
			[
				{
					...payload,
					orgId: toObjectIdOrNull(payload.orgId),
					attachedPolicyIds: (payload.attachedPolicyIds ?? []).map(
						toObjectId,
					),
				},
			],
			{ session },
		).then((res) => res[0]);
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createIamGroupDB",
			success: "true",
		});
		return result ?? null;
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createIamGroupDB",
			success: "false",
		});
		return null;
	}
}

export async function setGroupAttachedPoliciesDB({
	groupId,
	attachedPolicyIds,
	session,
}: {
	groupId: string;
	attachedPolicyIds: (mongoose.Types.ObjectId | string)[];
	session?: ClientSession;
}): Promise<IIamGroup | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await IamGroup.findOneAndUpdate(
			{ _id: toObjectId(groupId) },
			{ attachedPolicyIds: attachedPolicyIds.map(toObjectId) },
			{ returnDocument: "after", session },
		);
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "setGroupAttachedPoliciesDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "setGroupAttachedPoliciesDB",
			success: "false",
		});
		return null;
	}
}

export async function getIamGroupsByIdsDB({
	ids,
	session,
}: {
	ids: (mongoose.Types.ObjectId | string)[];
	session?: ClientSession;
}): Promise<IIamGroup[]> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await IamGroup.find(
			{ _id: { $in: ids.map(toObjectId) } },
			null,
			{ session },
		).lean<IIamGroup[]>();
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getIamGroupsByIdsDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getIamGroupsByIdsDB",
			success: "false",
		});
		return [];
	}
}

export async function listIamGroupsDB({
	plane,
	orgId,
	session,
}: {
	plane: Plane;
	orgId: mongoose.Types.ObjectId | string | null;
	session?: ClientSession;
}): Promise<IIamGroup[]> {
	try {
		return await IamGroup.find(
			{ plane, orgId: toObjectIdOrNull(orgId) },
			null,
			{ session },
		)
			.sort({ name: 1 })
			.lean<IIamGroup[]>();
	} catch {
		return [];
	}
}

/**
 * Every group on a plane, across all orgs. Used by the operator console to
 * present the full set of org groups a user can be added to (each labelled with
 * its owning org). Sorted by orgId then name for a stable grouped display.
 */
export async function listGroupsByPlaneDB({
	plane,
	session,
}: {
	plane: Plane;
	session?: ClientSession;
}): Promise<IIamGroup[]> {
	try {
		return await IamGroup.find({ plane }, null, { session })
			.sort({ orgId: 1, name: 1 })
			.lean<IIamGroup[]>();
	} catch {
		return [];
	}
}

/** Delete a customer-managed group. System groups are immutable and never removed. */
export async function deleteIamGroupDB({
	id,
	orgId,
	session,
}: {
	id: string;
	orgId?: mongoose.Types.ObjectId | string | null;
	session?: ClientSession;
}): Promise<boolean> {
	try {
		const filter: Record<string, unknown> = {
			_id: toObjectId(id),
			managedBy: "customer",
		};
		if (orgId !== undefined) filter.orgId = toObjectIdOrNull(orgId);
		const result = await IamGroup.deleteOne(filter, { session });
		return result.deletedCount > 0;
	} catch {
		return false;
	}
}

export async function findIamGroupByNameDB({
	plane,
	orgId,
	name,
	session,
}: {
	plane: Plane;
	orgId: mongoose.Types.ObjectId | string | null;
	name: string;
	session?: ClientSession;
}): Promise<IIamGroup | null> {
	try {
		return await IamGroup.findOne(
			{ plane, orgId: toObjectIdOrNull(orgId), name },
			null,
			{ session },
		).lean<IIamGroup>();
	} catch {
		return null;
	}
}
