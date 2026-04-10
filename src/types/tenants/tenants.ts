export interface IRawTenant {
	_id: string;
	name: string;
	avatar?: string;
	property: string;
	unit: string;
	monthlyRent: number;
	paymentStatus: "Paid" | "Due Soon" | "Overdue";
	moveInDate: string;
	leaseExpiry?: string;
	phone: string;
	email: string;
}

export interface IRawTenantStats {
	totalTenants: number;
	activeTenants: number;
	expiringLeases: number;
	overduePayments: number;
}

export interface IRawTenantDetail {
	_id: string;
	name: string;
	avatar?: string;
	property: string;
	unit: string;
	phone: string;
	email: string;
	moveInDate: string;
	monthlyRent: number;
	rentDueDay: number;
	nextDueDate?: string;
	lastPaymentAmount?: number;
	lastPaymentDate?: string;
	overdueStatus: boolean;
	overdueDays: number;
	transactions?: IRawTenantTransaction[];
	paymentHistory?: IRawPaymentHistoryBlock[];
	recentActivity?: IRawTenantActivity[];
	paymentStats?: IRawPaymentStats;
}

export interface IRawTenantTransaction {
	_id: string;
	date: string;
	type: "Rent" | "Maintenance" | "Deposit" | "Other";
	description: string;
	paymentMethod: string;
	amount: number;
	amountType: "credit" | "debit";
	runningBalance: number;
}

export interface IRawPaymentHistoryBlock {
	_id: string;
	month: string;
	status: "paid" | "late" | "overdue" | "upcoming";
}

export interface IRawTenantActivity {
	_id: string;
	label: string;
	detail: string;
	date: string;
	type: "success" | "warning" | "error" | "info";
}

export interface IRawPaymentStats {
	reliabilityScore: number;
	avgPaymentDelay: number;
	totalPaidThisYear: number;
	outstandingBalance: number;
}

export interface ITenantListItem {
	id: string;
	name: string;
	avatar: string;
	property: string;
	unit: string;
	monthlyRent: string;
	paymentStatus: "Paid" | "Due Soon" | "Overdue";
	moveInDate: string;
	phone: string;
	email: string;
	leaseExpiry: string;
}

export interface ITenantStatItem {
	id: string;
	label: string;
	value: string;
	subtext: string;
	subtextColor: string;
	icon: React.ReactNode;
	iconBg: string;
}

export interface ITenantDetail {
	id: string;
	name: string;
	avatar: string;
	property: string;
	unit: string;
	phone: string;
	email: string;
	moveInDate: string;
	tenancyDuration: string;
	monthlyRent: string;
	rentDueDay: string;
	nextDueDate: string;
	lastPaymentAmount: string;
	lastPaymentDate: string;
	overdueStatus: string;
	overdueDays: number;
}

export interface ITenantTransaction {
	id: string;
	date: string;
	type: "Rent" | "Maintenance" | "Deposit" | "Other";
	description: string;
	paymentMethod: string;
	amount: string;
	amountType: "credit" | "debit";
	runningBalance: string;
}

export interface IPaymentHistoryBlock {
	id: string;
	month: string;
	status: "paid" | "late" | "overdue" | "upcoming";
}

export interface ITenantActivity {
	id: string;
	label: string;
	detail: string;
	date: string;
	type: "success" | "warning" | "error" | "info";
}
