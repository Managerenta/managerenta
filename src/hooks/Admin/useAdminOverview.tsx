"use client";
import useSWR from "swr";
import { fetcher } from "@/constants";

export interface IAdminOverview {
	organizations: number;
	users: number;
	operators: number;
	properties: number;
	units: number;
	occupiedUnits: number;
	vacantUnits: number;
	tenants: number;
	totalRevenue: number;
	monthlyRecurringRevenue: number;
	occupancyRate: number;
	orgGrowth: { month: string; created: number }[];
}

export function useAdminOverview() {
	const { data, isLoading } = useSWR<{ data?: IAdminOverview }>(
		"/api/admin/overview",
		fetcher,
		{ revalidateOnMount: true },
	);
	return { overview: data?.data, isLoading };
}
