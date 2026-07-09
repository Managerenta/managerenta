"use client";
import useSWR from "swr";
import { fetcher } from "@/constants";

export interface IAdminOrgRow {
	id: string;
	name: string;
	description: string;
	suspended: boolean;
	createdAt: string;
	owner: { id: string; name: string; email: string } | null;
	memberCount: number;
	propertyCount: number;
	tenantCount: number;
}

export interface IAdminOrgList {
	organizations: IAdminOrgRow[];
	total: number;
}

export function useAdminOrganizations(search: string) {
	const key = `/api/admin/organizations?search=${encodeURIComponent(
		search,
	)}&offset=0&limit=20`;
	const { data, isLoading } = useSWR<{ data?: IAdminOrgList }>(key, fetcher, {
		revalidateOnMount: true,
	});
	return {
		organizations: data?.data?.organizations ?? [],
		total: data?.data?.total ?? 0,
		isLoading,
		mutateKey: key,
	};
}
