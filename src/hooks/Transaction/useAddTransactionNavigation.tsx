"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export default function useAddTransactionNavigation() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const isAddTransactionView = useMemo<boolean>(() => {
		return searchParams.get("view") === "add-transaction";
	}, [searchParams]);

	const openAddTransaction = useCallback(() => {
		const newSearchParams = new URLSearchParams(searchParams.toString());
		newSearchParams.set("view", "add-transaction");

		window.history.replaceState(
			{},
			"",
			`${pathname}?${newSearchParams.toString()}`,
		);
	}, [pathname, searchParams]);

	const closeAddTransaction = useCallback(() => {
		const newSearchParams = new URLSearchParams(searchParams.toString());
		newSearchParams.delete("view");

		const paramString = newSearchParams.toString();
		const newUrl = paramString ? `${pathname}?${paramString}` : pathname;

		window.history.replaceState({}, "", newUrl);
	}, [pathname, searchParams]);

	return {
		isAddTransactionView,
		openAddTransaction,
		closeAddTransaction,
	};
}
