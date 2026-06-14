export type IVendorSpecialty =
	| "plumbing"
	| "electrical"
	| "hvac"
	| "appliance"
	| "structural"
	| "pest"
	| "cleaning"
	| "general"
	| "other";

export interface IVendorCreateInput {
	userId: string;
	name: string;
	company?: string;
	specialty: IVendorSpecialty;
	phone?: string;
	email?: string;
	address?: string;
	notes?: string;
	rating?: number;
}

export interface IVendor extends IVendorCreateInput {
	id: string;
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}
