import { ErrTenantNotFound } from "../../../constants";
import { getTenantByIdDB, getTransactionsByTenantIdDB } from "../../../models";

export default async function listTransactions({
	tenantId,
	userId,
}: {
	tenantId: string;
	userId: string;
}) {
	const tenant = await getTenantByIdDB({ id: tenantId, userId });
	if (!tenant) throw ErrTenantNotFound;

	const transactions = await getTransactionsByTenantIdDB({
		tenantId,
		userId,
	});
	return { transactions, total: transactions.length };
}
