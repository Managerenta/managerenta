import { deleteTransactionDB } from "../../../models";
import { invalidateCacheKeys } from "./utils";

export default async function deleteTransaction({
	id,
	tenantId,
	userId,
}: {
	id: string;
	tenantId: string;
	userId: string;
}) {
	const result = await deleteTransactionDB({ id, tenantId, userId });
	if (result) await invalidateCacheKeys({ userId, tenantId });
	return result;
}
