"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function useTenantNavigation() {
	const router = useRouter();

	const openTenantDetail = useCallback(
		(tenantId: string) => {
			router.push(`/tenants/${tenantId}`);
		},
		[router],
	);

	const closeTenantDetail = useCallback(() => {
		router.push("/tenants");
	}, [router]);

	return {
		openTenantDetail,
		closeTenantDetail,
	};
}
