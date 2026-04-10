"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function usePropertiesNavigation() {
	const router = useRouter();

	const openPropertyDetail = useCallback(
		(propertyId: string) => {
			router.push(`/properties/${propertyId}`);
		},
		[router],
	);

	const closePropertyDetail = useCallback(() => {
		router.push("/properties");
	}, [router]);

	const goToProperties = useCallback(() => {
		router.push("/properties");
	}, [router]);

	return {
		openPropertyDetail,
		closePropertyDetail,
		goToProperties,
	};
}
