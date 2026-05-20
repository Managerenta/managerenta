import { invalidateCacheKeys as invalidateTenantsCacheKeys } from "../../utils";

export default async function invalidateCacheKeys({
	userId,
	tenantId,
}: {
	userId: string;
	tenantId: string;
}): Promise<void> {
	// Transactions belong to a tenant; invalidating any transaction-related read
	// is equivalent to refreshing the tenant aggregate views.
	await invalidateTenantsCacheKeys({ userId, id: tenantId });
}
