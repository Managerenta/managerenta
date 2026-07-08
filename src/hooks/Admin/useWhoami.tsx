"use client";
import useSWR from "swr";
import { fetcher } from "@/constants";

export interface IWhoami {
	operator: boolean;
	status: string | null;
}

export function useWhoami() {
	const { data, isLoading } = useSWR<{ data?: IWhoami }>(
		"/api/admin/whoami",
		fetcher,
	);
	return {
		operator: data?.data?.operator === true,
		status: data?.data?.status ?? null,
		isLoading,
	};
}
