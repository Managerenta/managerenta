import type mongoose from "mongoose";

export enum IOrganizationRole {
	ADMIN = "admin",
	MANAGER = "manager",
	// EDITOR = "editor",
	VIEWER = "viewer",
}

export interface IOrganizationMemberPermission {
	memberId: mongoose.Types.ObjectId;
	permission: IOrganizationRole;
}

export interface IOrganizationCreateInput {
	ownerId: mongoose.Types.ObjectId;
	name: string;
	description: string;
	logo: string;
	website?: string;
	x?: string;
	instagram?: string;
	telegram?: string;
}

export interface IOrganization extends IOrganizationCreateInput {
	id: mongoose.Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
	members: IOrganizationMemberPermission[];
	deleted: boolean;
}
