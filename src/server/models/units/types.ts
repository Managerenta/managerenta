import type { IUnitTenant, IUnitTenantPopulated } from "./tenant/types";

export enum IUnitStatus {
	Occupied = "Occupied",
	Vacant = "Vacant",
}

export enum IPaymentStatus {
	Paid = "Paid",
	DueSoon = "Due Soon",
	Overdue = "Overdue",
}

export type IUnitPopulated = Omit<IUnit, "tenant"> & {
	tenant: IUnitTenantPopulated | null;
};

export interface IUnitCreateInput {
	name: string;
	rent: number;
	propertyId: string;
	userId: string;
}

export interface IUnit extends IUnitCreateInput {
	id: string;
	status: IUnitStatus;
	tenant: IUnitTenant | null;
	dueDate: Date | null;
	paymentStatus: IPaymentStatus | null;
	vacantDays: number | null;
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}
