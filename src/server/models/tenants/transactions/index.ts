import mongoose, { type ClientSession } from "mongoose";
import { databaseResponseTimeHistogram } from "../../../metrics";
import { IOperationType } from "../../utils";
import type { ITransaction, ITransactionCreateInput } from "./types";

const collectionName = "transactions";

const transactionSchema = new mongoose.Schema<ITransaction>(
	{
		tenantId: { type: String, required: true },
		userId: { type: String, required: true },
		type: {
			type: String,
			required: true,
			enum: ["rent", "maintenance", "utilities", "other"],
		},
		description: { type: String, required: true },
		amount: { type: Number, required: true },
		amountType: { type: String, required: true, enum: ["credit", "debit"] },
		paymentMethod: {
			type: String,
			required: true,
			enum: ["bank-transfer", "cash", "mobile-money", "card", "check"],
		},
		date: { type: Date, required: true },
		period: { type: Number, required: false, default: 1, min: 1 },
		periodStart: { type: Date, required: false },
		periodEnd: { type: Date, required: false },
	},
	{ timestamps: true },
);

transactionSchema.index({ tenantId: 1, type: 1, amountType: 1, date: -1 });
transactionSchema.index({ userId: 1, date: -1 });

export const Transaction = mongoose.model<ITransaction>(
	collectionName,
	transactionSchema,
);

export async function createTransactionDB({
	payload,
	session,
}: {
	payload: ITransactionCreateInput;
	session?: ClientSession;
}): Promise<ITransaction | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const doc = new Transaction(payload);
		const result = await doc.save({ session });
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createTransactionDB",
			success: "true",
		});
		return { ...result.toObject(), id: result.id };
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createTransactionDB",
			success: "false",
		});
		return null;
	}
}

export async function getTransactionsByTenantIdDB({
	tenantId,
	userId,
	session,
}: {
	tenantId: string;
	userId: string;
	session?: ClientSession;
}): Promise<ITransaction[]> {
	const results = await Transaction.aggregate<ITransaction>(
		[
			{ $match: { tenantId, userId } },
			{ $sort: { date: -1 } },
			{ $addFields: { id: { $toString: "$_id" } } },
		],
		{ session },
	);
	return results;
}

export async function sumRentCreditsByTenantIdsDB({
	tenantIds,
	since,
	session,
}: {
	tenantIds: string[];
	since?: Date;
	session?: ClientSession;
}): Promise<number> {
	if (tenantIds.length === 0) return 0;
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const match: Record<string, unknown> = {
			tenantId: { $in: tenantIds },
			type: "rent",
			amountType: "credit",
		};
		if (since) match.date = { $gte: since };
		const result = await Transaction.aggregate<{ total: number }>(
			[
				{ $match: match },
				{ $group: { _id: null, total: { $sum: "$amount" } } },
			],
			{ session },
		);
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "sumRentCreditsByTenantIdsDB",
			success: "true",
		});
		return result[0]?.total ?? 0;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "sumRentCreditsByTenantIdsDB",
			success: "false",
		});
		return 0;
	}
}

export * from "./types";
