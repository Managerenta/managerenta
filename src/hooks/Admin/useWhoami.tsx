"use client";
import useSWR from "swr";
import { fetcher } from "@/constants";

export interface IWhoami {
	operator: boolean;
	status: string | null;
}

export function useWhoami() {
	// The global SWRConfig disables revalidateOnMount; without this the whoami
	// probe never fires and the operator gate treats every user as a
	// non-operator, bouncing them out of /admin. Match the codebase convention.
	const { data, isLoading } = useSWR<{ data?: IWhoami }>(
		"/api/admin/whoami",
		fetcher,
		{ revalidateOnMount: true },
	);
	return {
		operator: data?.data?.operator === true,
		status: data?.data?.status ?? null,
		isLoading,
	};
}
