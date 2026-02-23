"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export default function usePropertiesNavigation() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const router = useRouter();

	const selectedPropertyId = useMemo<string | null>(() => {
		return searchParams.get("propertyId");
	}, [searchParams]);

	const isDetailView = useMemo<boolean>(() => {
		return !!selectedPropertyId;
	}, [selectedPropertyId]);

	const openPropertyDetail = useCallback(
		(propertyId: string) => {
			const newSearchParams = new URLSearchParams(
				searchParams.toString(),
			);
			newSearchParams.set("propertyId", propertyId);

			window.history.replaceState(
				{},
				"",
				`${pathname}?${newSearchParams.toString()}`,
			);
		},
		[pathname, searchParams],
	);

	const closePropertyDetail = useCallback(() => {
		window.history.replaceState({}, "", pathname);
	}, [pathname]);

	const goToProperties = useCallback(() => {
		router.push("/properties");
	}, [router]);

	return {
		selectedPropertyId,
		isDetailView,
		openPropertyDetail,
		closePropertyDetail,
		goToProperties,
	};
}
