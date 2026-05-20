export type ITransactionType = "rent" | "maintenance" | "utilities" | "other";
export type IAmountType = "credit" | "debit";
export type IPaymentMethod =
	| "bank-transfer"
	| "cash"
	| "mobile-money"
	| "card"
	| "check";

export interface ITransactionCreateInput {
	tenantId: string;
	userId: string;
	type: ITransactionType;
	description: string;
	amount: number;
	amountType: IAmountType;
	paymentMethod: IPaymentMethod;
	date: Date;
	period?: number;
	periodStart?: Date;
	periodEnd?: Date;
}

export interface ITransaction extends ITransactionCreateInput {
	id: string;
	createdAt: Date;
	updatedAt: Date;
}
