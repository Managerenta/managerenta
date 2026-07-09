"use client";
import useSWR from "swr";
import { fetcher } from "@/constants";

export type UserStatus = "active" | "suspended";

export interface IAdminUserRow {
	id: string;
	name: string;
	email: string;
	username: string;
	status: UserStatus;
	currentOrganizationId: string | null;
	createdAt: string;
}

export interface IAdminUserList {
	users: IAdminUserRow[];
	total: number;
}

export interface IUserMembership {
	groupId: string;
	groupName: string;
	orgId: string | null;
	orgName: string;
}

export interface IAdminUserDetail extends IAdminUserRow {
	memberships: IUserMembership[];
}

export interface IOrgGroupOption {
	groupId: string;
	name: string;
	orgId: string | null;
	orgName: string;
	managedBy: "system" | "customer";
}

export function useAdminUsers(search: string) {
	const key = `/api/admin/users?search=${encodeURIComponent(
		search,
	)}&offset=0&limit=20`;
	const { data, isLoading } = useSWR<{ data?: IAdminUserList }>(
		key,
		fetcher,
		{
			revalidateOnMount: true,
		},
	);
	return {
		users: data?.data?.users ?? [],
		total: data?.data?.total ?? 0,
		isLoading,
		mutateKey: key,
	};
}

export function useAdminUserDetail(userId: string | null) {
	const key = userId ? `/api/admin/users/${userId}` : null;
	const { data, isLoading, mutate } = useSWR<{ data?: IAdminUserDetail }>(
		key,
		fetcher,
		{ revalidateOnMount: true },
	);
	return { detail: data?.data ?? null, isLoading, mutate };
}

export function useOrgGroups() {
	const key = "/api/admin/iam/org-groups";
	const { data, isLoading } = useSWR<{ data?: IOrgGroupOption[] }>(
		key,
		fetcher,
		{ revalidateOnMount: true },
	);
	return { orgGroups: data?.data ?? [], isLoading, mutateKey: key };
}
