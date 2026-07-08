import mongoose, { type ClientSession } from "mongoose";
import { z as zod } from "zod";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../../models/utils";
import type { Plane, PolicyDocument } from "../types";
import type { IIamPolicy, IIamPolicyCreateInput } from "./types";

const collectionName = "iampolicies";

// ── Zod validation ──────────────────────────────────────────────────────────
// Policy documents are validated on write so a malformed statement can never
// reach the pure engine. The engine additionally treats any unparseable
// statement as non-matching — defence in depth.

export const conditionBlockSchema = zod.record(
	zod.string(),
	zod.record(zod.string(), zod.array(zod.string())),
);

export const policyStatementSchema = zod
	.object({
		sid: zod.string().max(128).optional(),
		effect: zod.enum(["Allow", "Deny"]),
		action: zod.array(zod.string().min(1)).min(1),
		resource: zod.array(zod.string().min(1)).min(1),
		condition: conditionBlockSchema.optional(),
	})
	.strict();

export const policyDocumentSchema = zod
	.object({
		version: zod.string().min(1),
		statements: zod.array(policyStatementSchema).min(1),
	})
	.strict();

/** Parse-or-throw. Returns a typed document; throws ZodError on malformed input. */
export function parsePolicyDocument(value: unknown): PolicyDocument {
	return policyDocumentSchema.parse(value) as PolicyDocument;
}

/** Non-throwing validity check used by callers that must fail closed. */
export function isValidPolicyDocument(value: unknown): boolean {
	return policyDocumentSchema.safeParse(value).success;
}

// ── Schema ──────────────────────────────────────────────────────────────────

const statementSchema = new mongoose.Schema(
	{
		sid: { type: String, required: false },
		effect: { type: String, enum: ["Allow", "Deny"], required: true },
		action: { type: [String], required: true },
		resource: { type: [String], required: true },
		condition: { type: mongoose.Schema.Types.Mixed, required: false },
	},
	{ _id: false },
);

const documentSchema = new mongoose.Schema(
	{
		version: { type: String, required: true },
		statements: { type: [statementSchema], required: true },
	},
	{ _id: false },
);

const schema = new mongoose.Schema<IIamPolicy>(
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
		document: { type: documentSchema, required: true },
	},
	{ timestamps: true },
);

// A policy name is unique within its plane+org. Two orgs may both have an
// "OrgAdmin"; a system policy (orgId null) is unique per plane.
schema.index({ plane: 1, orgId: 1, name: 1 }, { unique: true });

export const IamPolicy: mongoose.Model<IIamPolicy> =
	(mongoose.models[collectionName] as
		| mongoose.Model<IIamPolicy>
		| undefined) ?? mongoose.model<IIamPolicy>(collectionName, schema);

function toObjectIdOrNull(
	value: mongoose.Types.ObjectId | string | null | undefined,
): mongoose.Types.ObjectId | null {
	if (value === null || value === undefined) return null;
	return typeof value === "string"
		? new mongoose.Types.ObjectId(value)
		: value;
}

export async function createIamPolicyDB({
	payload,
	session,
}: {
	payload: IIamPolicyCreateInput;
	session?: ClientSession;
}): Promise<IIamPolicy | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		// Validate the document up front so a malformed policy is rejected before
		// it ever lands in the collection.
		parsePolicyDocument(payload.document);
		const result = await IamPolicy.create(
			[{ ...payload, orgId: toObjectIdOrNull(payload.orgId) }],
			{ session },
		).then((res) => res[0]);
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createIamPolicyDB",
			success: "true",
		});
		return result ?? null;
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createIamPolicyDB",
			success: "false",
		});
		return null;
	}
}

export async function updateIamPolicyDocumentDB({
	id,
	document,
	session,
}: {
	id: string;
	document: PolicyDocument;
	session?: ClientSession;
}): Promise<IIamPolicy | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		parsePolicyDocument(document);
		// System-managed policies are immutable from this path.
		const result = await IamPolicy.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), managedBy: "customer" },
			{ document },
			{ returnDocument: "after", session },
		);
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateIamPolicyDocumentDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateIamPolicyDocumentDB",
			success: "false",
		});
		return null;
	}
}

/**
 * Reconcile a SYSTEM policy's document to the canonical definition. Used ONLY by
 * idempotent seeding/migration to repair drift when a system policy's canonical
 * shape changes between releases. Never reachable from the customer edit path
 * (which is restricted to `managedBy:"customer"`), so system policies stay
 * immutable to tenants while remaining releasable by the platform.
 */
export async function setSystemPolicyDocumentDB({
	id,
	document,
	session,
}: {
	id: string;
	document: PolicyDocument;
	session?: ClientSession;
}): Promise<IIamPolicy | null> {
	try {
		parsePolicyDocument(document);
		return await IamPolicy.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), managedBy: "system" },
			{ document },
			{ returnDocument: "after", session },
		);
	} catch {
		return null;
	}
}

export async function getIamPoliciesByIdsDB({
	ids,
	session,
}: {
	ids: (mongoose.Types.ObjectId | string)[];
	session?: ClientSession;
}): Promise<IIamPolicy[]> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const objectIds = ids.map((id) =>
			typeof id === "string" ? new mongoose.Types.ObjectId(id) : id,
		);
		const result = await IamPolicy.find({ _id: { $in: objectIds } }, null, {
			session,
		}).lean<IIamPolicy[]>();
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getIamPoliciesByIdsDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getIamPoliciesByIdsDB",
			success: "false",
		});
		return [];
	}
}

export async function listIamPoliciesDB({
	plane,
	orgId,
	session,
}: {
	plane: Plane;
	orgId: mongoose.Types.ObjectId | string | null;
	session?: ClientSession;
}): Promise<IIamPolicy[]> {
	try {
		return await IamPolicy.find(
			{ plane, orgId: toObjectIdOrNull(orgId) },
			null,
			{ session },
		)
			.sort({ name: 1 })
			.lean<IIamPolicy[]>();
	} catch {
		return [];
	}
}

/** Delete a customer-managed policy. System policies are immutable and never removed. */
export async function deleteIamPolicyDB({
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
			_id: new mongoose.Types.ObjectId(id),
			managedBy: "customer",
		};
		// Org-admin callers scope deletion to their own org; platform callers omit.
		if (orgId !== undefined) filter.orgId = toObjectIdOrNull(orgId);
		const result = await IamPolicy.deleteOne(filter, { session });
		return result.deletedCount > 0;
	} catch {
		return false;
	}
}

export async function findIamPolicyByNameDB({
	plane,
	orgId,
	name,
	session,
}: {
	plane: Plane;
	orgId: mongoose.Types.ObjectId | string | null;
	name: string;
	session?: ClientSession;
}): Promise<IIamPolicy | null> {
	try {
		return await IamPolicy.findOne(
			{ plane, orgId: toObjectIdOrNull(orgId), name },
			null,
			{ session },
		).lean<IIamPolicy>();
	} catch {
		return null;
	}
}
