"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export default function useSettingsNavigation() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const activeTab = useMemo<string>(() => {
		return searchParams.get("tab") || "account";
	}, [searchParams]);

	const openTab = useCallback(
		(tabValue: string) => {
			const newSearchParams = new URLSearchParams(
				searchParams.toString(),
			);
			newSearchParams.set("tab", tabValue);

			window.history.replaceState(
				{},
				"",
				`${pathname}?${newSearchParams.toString()}`,
			);
		},
		[pathname, searchParams],
	);

	return {
		activeTab,
		openTab,
	};
}
