import type mongoose from "mongoose";
import type { ManagedBy, Plane, PolicyDocument, PrincipalType } from "../types";

export type OperatorStatus = "active" | "disabled";

export interface IIamPolicy {
	_id: mongoose.Types.ObjectId;
	id: string;
	name: string;
	plane: Plane;
	orgId: mongoose.Types.ObjectId | null;
	managedBy: ManagedBy;
	document: PolicyDocument;
	createdAt: Date;
	updatedAt: Date;
}

export interface IIamPolicyCreateInput {
	name: string;
	plane: Plane;
	orgId?: mongoose.Types.ObjectId | string | null;
	managedBy: ManagedBy;
	document: PolicyDocument;
}

export interface IIamGroup {
	_id: mongoose.Types.ObjectId;
	id: string;
	name: string;
	plane: Plane;
	orgId: mongoose.Types.ObjectId | null;
	managedBy: ManagedBy;
	attachedPolicyIds: mongoose.Types.ObjectId[];
	createdAt: Date;
	updatedAt: Date;
}

export interface IIamGroupCreateInput {
	name: string;
	plane: Plane;
	orgId?: mongoose.Types.ObjectId | string | null;
	managedBy: ManagedBy;
	attachedPolicyIds?: (mongoose.Types.ObjectId | string)[];
}

export interface IIamGroupMembership {
	_id: mongoose.Types.ObjectId;
	id: string;
	groupId: mongoose.Types.ObjectId;
	principalType: PrincipalType;
	principalId: mongoose.Types.ObjectId;
	orgId: mongoose.Types.ObjectId | null;
	createdAt: Date;
}

export interface IIamGroupMembershipCreateInput {
	groupId: mongoose.Types.ObjectId | string;
	principalType: PrincipalType;
	principalId: mongoose.Types.ObjectId | string;
	orgId?: mongoose.Types.ObjectId | string | null;
}

export interface IIamOperator {
	_id: mongoose.Types.ObjectId;
	id: string;
	userId: mongoose.Types.ObjectId;
	status: OperatorStatus;
	createdAt: Date;
}

export interface IIamOperatorCreateInput {
	userId: mongoose.Types.ObjectId | string;
	status?: OperatorStatus;
}
