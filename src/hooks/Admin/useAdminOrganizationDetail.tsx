"use client";
import useSWR from "swr";
import { fetcher } from "@/constants";

export interface IAdminOrgMember {
	memberId: string;
	permission: string;
	name: string;
	email: string;
}

export interface IAdminOrgDetail {
	id: string;
	name: string;
	description: string;
	suspended: boolean;
	createdAt: string;
	owner: { id: string; name: string; email: string } | null;
	members: IAdminOrgMember[];
	stats: {
		properties: number;
		units: number;
		occupiedUnits: number;
		tenants: number;
		revenue: number;
	};
}

export function useAdminOrganizationDetail(id: string) {
	const key = `/api/admin/organizations/${id}`;
	const { data, isLoading, mutate } = useSWR<{ data?: IAdminOrgDetail }>(
		id ? key : null,
		fetcher,
	);
	return { detail: data?.data, isLoading, mutate };
}
