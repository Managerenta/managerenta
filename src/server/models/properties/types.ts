export type IPropertyType =
	| "Apartment"
	| "House"
	| "Commercial"
	| "Land"
	| "Studio"
	| "Duplex"
	| "Highrise"
	| "Bungalow";

export interface IPropertyCreateInput {
	name: string;
	address: string;
	type: IPropertyType;
	totalUnits: number;
	monthlyRent?: number;
	description?: string;
	image?: string;
	userId: string;
}

export interface IPropertyUpdateInput {
	name?: string;
	address?: string;
	type?: IPropertyType;
	totalUnits?: number;
	monthlyRent?: number;
	description?: string;
	image?: string;
}

export interface IProperty extends IPropertyCreateInput {
	id: string;
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}
