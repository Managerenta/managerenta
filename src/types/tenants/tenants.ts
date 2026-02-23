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
	status: "paid" | "late" | "overdue";
}

export interface ITenantActivity {
	id: string;
	label: string;
	detail: string;
	date: string;
	type: "success" | "warning" | "error" | "info";
}
