"use client";
import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";

export default function useAddTransactionNavigation() {
	const router = useRouter();
	const params = useParams();

	const openAddTransaction = useCallback(
		(tenantId: string) => {
			router.push(`/tenants/${tenantId}/add-transaction`);
		},
		[router],
	);

	const closeAddTransaction = useCallback(() => {
		const tenantId = params?.tenantId as string | undefined;
		router.push(tenantId ? `/tenants/${tenantId}` : "/tenants");
	}, [router, params]);

	return { openAddTransaction, closeAddTransaction };
}
