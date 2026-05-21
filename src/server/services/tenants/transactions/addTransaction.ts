import mongoose from "mongoose";
import { ErrTenantNotFound } from "../../../constants";
import { createTransactionDB, getTenantByIdDB } from "../../../models";
import type {
	IAmountType,
	IPaymentMethod,
	ITransactionType,
} from "../../../models/tenants/transactions/types";
import { notifyPaymentReceived } from "../../notifications";
import { invalidateCacheKeys } from "./utils";

export default async function addTransaction({
	tenantId,
	userId,
	type,
	description,
	amount,
	amountType,
	paymentMethod,
	date,
	period = 1,
}: {
	tenantId: string;
	userId: string;
	type: ITransactionType;
	description?: string;
	amount: number;
	amountType: IAmountType;
	paymentMethod: IPaymentMethod;
	date: Date;
	period?: number;
}) {
	const tenant = await getTenantByIdDB({ id: tenantId, userId });
	if (!tenant) throw ErrTenantNotFound;

	const rentDueDay = tenant.rentDueDay ?? 1;

	let periodStart: Date | undefined;
	let periodEnd: Date | undefined;

	if (type === "rent" && amountType === "credit") {
		const txDate = new Date(date);
		periodStart = new Date(
			txDate.getFullYear(),
			txDate.getMonth(),
			rentDueDay,
		);
		periodEnd = new Date(
			periodStart.getFullYear(),
			periodStart.getMonth() + period,
			0,
		);
	}

	const resolvedDescription =
		description ??
		(type === "rent"
			? period > 1
				? `Rent payment — ${period} months`
				: "Rent payment"
			: type);

	const result = await createTransactionDB({
		payload: {
			tenantId,
			userId,
			type,
			description: resolvedDescription,
			amount,
			amountType,
			paymentMethod,
			date,
			period,
			periodStart,
			periodEnd,
		},
	});

	if (result) {
		await invalidateCacheKeys({ userId, tenantId });

		if (type === "rent" && amountType === "credit") {
			const Unit = mongoose.models.units;
			const unit = Unit
				? await Unit.findById(
						new mongoose.Types.ObjectId(tenant.unitId),
					).lean()
				: null;
			void notifyPaymentReceived({
				userId,
				tenantId,
				tenantName: tenant.name,
				unitName: (unit as { name?: string } | null)?.name,
				amount,
				paymentMethod,
			});
		}
	}

	return result;
}
