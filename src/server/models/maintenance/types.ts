export type IMaintenanceCategory =
	| "plumbing"
	| "electrical"
	| "hvac"
	| "appliance"
	| "structural"
	| "pest"
	| "cleaning"
	| "other";

export type IMaintenancePriority = "low" | "medium" | "high" | "urgent";

export type IMaintenanceStatus =
	| "open"
	| "in-progress"
	| "on-hold"
	| "completed"
	| "cancelled";

export interface IMaintenanceCreateInput {
	userId: string;
	propertyId: string;
	unitId?: string;
	tenantId?: string;
	vendorId?: string;
	title: string;
	description: string;
	category: IMaintenanceCategory;
	priority?: IMaintenancePriority;
	status?: IMaintenanceStatus;
	cost?: number;
	scheduledDate?: Date;
	completedDate?: Date;
	images?: string[];
}

export interface IMaintenanceRequest extends IMaintenanceCreateInput {
	id: string;
	priority: IMaintenancePriority;
	status: IMaintenanceStatus;
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}
