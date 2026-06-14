import { ErrTenantNotFound } from "../../../constants";
import { getTenantByIdDB, updateTransactionDB } from "../../../models";
import type {
	IAmountType,
	IPaymentMethod,
	ITransactionType,
} from "../../../models/tenants/transactions/types";
import { invalidateCacheKeys } from "./utils";

/**
 * Edit an existing transaction. When the transaction is (or becomes) a rent
 * credit, the period window is recomputed from the tenant's rent due day and
 * the requested period so dashboard rent accounting stays correct.
 */
export default async function updateTransaction({
	id,
	tenantId,
	userId,
	payload,
}: {
	id: string;
	tenantId: string;
	userId: string;
	payload: {
		type?: ITransactionType;
		description?: string;
		amount?: number;
		amountType?: IAmountType;
		paymentMethod?: IPaymentMethod;
		date?: Date;
		period?: number;
	};
}) {
	const tenant = await getTenantByIdDB({ id: tenantId, userId });
	if (!tenant) throw ErrTenantNotFound;

	const rentDueDay = tenant.rentDueDay ?? 1;
	const next: Record<string, unknown> = { ...payload };

	const effectiveType = payload.type;
	const effectiveAmountType = payload.amountType;
	if (
		effectiveType === "rent" &&
		effectiveAmountType === "credit" &&
		payload.date
	) {
		const period = payload.period ?? 1;
		const txDate = new Date(payload.date);
		const periodStart = new Date(
			txDate.getFullYear(),
			txDate.getMonth(),
			rentDueDay,
		);
		const periodEnd = new Date(
			periodStart.getFullYear(),
			periodStart.getMonth() + period,
			0,
		);
		next.periodStart = periodStart;
		next.periodEnd = periodEnd;
	}

	const result = await updateTransactionDB({
		id,
		tenantId,
		userId,
		payload: next,
	});

	if (result) await invalidateCacheKeys({ userId, tenantId });
	return result;
}
