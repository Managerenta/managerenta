"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export default function useTenantNavigation() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const selectedTenantId = useMemo<string | null>(() => {
		return searchParams.get("tenantId");
	}, [searchParams]);

	const isTenantDetailView = useMemo<boolean>(() => {
		return !!selectedTenantId;
	}, [selectedTenantId]);

	const openTenantDetail = useCallback(
		(tenantId: string) => {
			const newSearchParams = new URLSearchParams(
				searchParams.toString(),
			);
			newSearchParams.set("tenantId", tenantId);

			window.history.replaceState(
				{},
				"",
				`${pathname}?${newSearchParams.toString()}`,
			);
		},
		[pathname, searchParams],
	);

	const closeTenantDetail = useCallback(() => {
		const newSearchParams = new URLSearchParams(searchParams.toString());
		newSearchParams.delete("tenantId");

		const paramString = newSearchParams.toString();
		const newUrl = paramString ? `${pathname}?${paramString}` : pathname;

		window.history.replaceState({}, "", newUrl);
	}, [pathname, searchParams]);

	return {
		selectedTenantId,
		isTenantDetailView,
		openTenantDetail,
		closeTenantDetail,
	};
}
