export interface IPropertyStatItem {
	id: string;
	label: string;
	value: string;
	subtext: string;
	subtextColor: string;
	icon: React.ReactNode;
	iconBg: string;
	progressBar?: { value: number; color: string };
}

export interface IPropertyList {
	id: string;
	name: string;
	address: string;
	type: string;
	typeBadgeColor: string;
	totalUnits: number;
	occupied: number;
	vacant: number;
	monthlyRevenue: string;
	occupancyStatus: "Excellent" | "Good" | "Needs Attention";
	image: string;
}

export interface IPropertyUnit {
	id: string;
	name: string;
	status: "Occupied" | "Vacant";
	tenantId?: string;
	tenantName?: string;
	tenantAvatar?: string;
	rent: string;
	rentAmount: number;
	dueDate?: string;
	paymentStatus?: "Paid" | "Due Soon" | "Overdue";
	vacantDays?: number;
}

export interface IPropertyDetail {
	id: string;
	name: string;
	address: string;
	type: string;
	dateAdded: string;
	monthlyRent: number;
	monthlyRentTotal: string;
	totalUnits: number;
	occupied: number;
	vacant: number;
	occupancyRate: number;
	units: IPropertyUnit[];
}

export interface ITopTenant {
	id: string;
	name: string;
	amount: string;
}

export interface ITransaction {
	id: string;
	name: string;
	date: string;
	unit: string;
	amount: string;
	type: "credit" | "debit";
}

export interface ITenantAction {
	id: string;
	name: string;
	property: string;
	amount: string;
	avatar: string;
	overdueDays?: number;
}
