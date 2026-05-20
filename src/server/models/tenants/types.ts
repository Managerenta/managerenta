export interface ITenantCreateInput {
	name: string;
	phone: string;
	email: string;
	unitId: string;
	propertyId: string;
	userId: string;
	moveInDate: Date;
	leaseExpiry?: Date;
	rentDueDay?: number;
}

export interface ITenant extends ITenantCreateInput {
	id: string;
	avatar?: string;
	status: "Active" | "Inactive";
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}
