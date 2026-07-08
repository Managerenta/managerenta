"use client";
import useSWR from "swr";
import { fetcher } from "@/constants";

export interface IAdminOperator {
	userId: string;
	status: "active" | "disabled";
	name: string;
	email: string;
	createdAt: string | null;
}

export interface IPolicyStatement {
	sid?: string;
	effect: "Allow" | "Deny";
	action: string[];
	resource: string[];
	condition?: Record<string, Record<string, string[]>>;
}

export interface IPolicyDocument {
	version: string;
	statements: IPolicyStatement[];
}

export interface IAdminGroup {
	_id: string;
	name: string;
	plane: string;
	orgId: string | null;
	managedBy: "system" | "customer";
	attachedPolicyIds: string[];
}

export interface IAdminPolicy {
	_id: string;
	name: string;
	plane: string;
	orgId: string | null;
	managedBy: "system" | "customer";
	document: IPolicyDocument;
}

export interface IAdminGroupMember {
	principalType: "user" | "operator";
	principalId: string;
	name: string;
	email: string;
}

export function useAdminOperators() {
	const key = "/api/admin/iam/operators";
	const { data, isLoading } = useSWR<{ data?: IAdminOperator[] }>(key, fetcher);
	return { operators: data?.data ?? [], isLoading, mutateKey: key };
}

export function useAdminGroups() {
	const key = "/api/admin/iam/groups";
	const { data, isLoading } = useSWR<{ data?: IAdminGroup[] }>(key, fetcher);
	return { groups: data?.data ?? [], isLoading, mutateKey: key };
}

export function useAdminPolicies() {
	const key = "/api/admin/iam/policies";
	const { data, isLoading } = useSWR<{ data?: IAdminPolicy[] }>(key, fetcher);
	return { policies: data?.data ?? [], isLoading, mutateKey: key };
}

export function useAdminGroupMembers(groupId: string | null) {
	const key = groupId ? `/api/admin/iam/groups/${groupId}/members` : null;
	const { data, isLoading, mutate } = useSWR<{ data?: IAdminGroupMember[] }>(
		key,
		fetcher,
	);
	return { members: data?.data ?? [], isLoading, mutate };
}
