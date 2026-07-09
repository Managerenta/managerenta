"use client";
import useSWR from "swr";
import { fetcher } from "@/constants";

export interface IAdminAnalytics {
	monthly: { month: string; revenue: number; expenses: number }[];
	topOrganizations: { orgId: string; name: string; revenue: number }[];
	occupancy: { occupied: number; vacant: number };
	maintenanceByCategory: { category: string; total: number }[];
}

export function useAdminAnalytics(months: number) {
	const { data, isLoading } = useSWR<{ data?: IAdminAnalytics }>(
		`/api/admin/analytics?months=${months}`,
		fetcher,
		{ revalidateOnMount: true },
	);
	return { analytics: data?.data, isLoading };
}
