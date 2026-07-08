"use client";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { api, fetcher, getErrorMessage } from "@/constants";
import { useToast } from "../useToast";

export type IamManagedBy = "system" | "customer";

export interface OrgMembershipRow {
	principalId: string;
	name: string;
	email: string;
	groupIds: string[];
}

export interface IIamGroup {
	_id: string;
	name: string;
	plane: string;
	orgId: string | null;
	managedBy: IamManagedBy;
	attachedPolicyIds: string[];
}

export interface IIamPolicyStatement {
	sid?: string;
	effect: string;
	action: string[];
	resource: string[];
	condition?: Record<string, Record<string, string[]>>;
}

export interface IIamPolicyDocument {
	version: string;
	statements: IIamPolicyStatement[];
}

export interface IIamPolicy {
	_id: string;
	name: string;
	plane: string;
	orgId: string | null;
	managedBy: IamManagedBy;
	document: IIamPolicyDocument;
}

export interface OrgRosterMember {
	memberId: string;
	name: string;
	email: string;
	avatar: string | null;
	permission: "admin" | "manager" | "viewer";
}

interface RosterResponse {
	data?: {
		ownerId: string;
		members: OrgRosterMember[];
		invites: unknown[];
	};
}

interface ForbiddenLike {
	response?: { status?: number };
}

function isForbidden(err: unknown): boolean {
	return (err as ForbiddenLike)?.response?.status === 403;
}

/**
 * Data layer for the org-admin "Access / IAM" settings tab. Joins the org
 * member roster (`/members`) with the IAM membership/group/policy resources and
 * exposes the mutators the UI needs. All calls are scoped to `orgId`; pass
 * `null` (personal workspace) to disable every request.
 */
export default function useOrgIam(orgId: string | null) {
	const toast = useToast();

	const base = orgId ? `/api/organizations/${orgId}/iam` : null;

	const {
		data: rosterResp,
		error: rosterError,
		mutate: mutateRoster,
	} = useSWR<RosterResponse>(
		orgId ? `/api/organizations/${orgId}/members` : null,
		fetcher,
		{ revalidateOnMount: true },
	);

	const {
		data: membersResp,
		error: membersError,
		mutate: mutateMembers,
	} = useSWR<{ data?: OrgMembershipRow[] }>(
		base ? `${base}/members` : null,
		fetcher,
		{ revalidateOnMount: true },
	);

	const {
		data: groupsResp,
		error: groupsError,
		mutate: mutateGroups,
	} = useSWR<{ data?: IIamGroup[] }>(
		base ? `${base}/groups` : null,
		fetcher,
		{ revalidateOnMount: true },
	);

	const {
		data: policiesResp,
		error: policiesError,
		mutate: mutatePolicies,
	} = useSWR<{ data?: IIamPolicy[] }>(
		base ? `${base}/policies` : null,
		fetcher,
		{ revalidateOnMount: true },
	);

	const roster = useMemo<OrgRosterMember[]>(
		() => rosterResp?.data?.members ?? [],
		[rosterResp],
	);
	const ownerId = rosterResp?.data?.ownerId ?? "";
	const iamMembers = useMemo<OrgMembershipRow[]>(
		() => membersResp?.data ?? [],
		[membersResp],
	);
	const groups = useMemo<IIamGroup[]>(
		() => groupsResp?.data ?? [],
		[groupsResp],
	);
	const policies = useMemo<IIamPolicy[]>(
		() => policiesResp?.data ?? [],
		[policiesResp],
	);

	// principalId -> set of groupIds the principal already belongs to.
	const membershipMap = useMemo<Record<string, Set<string>>>(() => {
		const map: Record<string, Set<string>> = {};
		for (const row of iamMembers) {
			map[row.principalId] = new Set(row.groupIds ?? []);
		}
		return map;
	}, [iamMembers]);

	const anyError =
		rosterError ?? membersError ?? groupsError ?? policiesError;
	const forbidden = isForbidden(anyError);

	const loading =
		!!orgId &&
		!forbidden &&
		(!rosterResp || !membersResp || !groupsResp || !policiesResp) &&
		!anyError;

	const toggleMembership = useCallback(
		async (groupId: string, principalId: string, isMember: boolean) => {
			if (!base) return;
			const url = `${base}/members`;
			try {
				if (isMember) {
					await api().delete(url, {
						data: { groupId, principalId },
					});
				} else {
					await api().post(url, { groupId, principalId });
				}
				await mutateMembers();
			} catch (err) {
				toast.push(
					getErrorMessage(err, "Failed to update membership"),
					{ type: "warn" },
				);
			}
		},
		[base, mutateMembers, toast],
	);

	const createGroup = useCallback(
		async (name: string, attachedPolicyIds?: string[]) => {
			if (!base) return false;
			try {
				await api().post(`${base}/groups`, {
					name,
					...(attachedPolicyIds ? { attachedPolicyIds } : {}),
				});
				await mutateGroups();
				toast.push("Group created", { type: "success" });
				return true;
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed to create group"), {
					type: "warn",
				});
				return false;
			}
		},
		[base, mutateGroups, toast],
	);

	const updateGroupPolicies = useCallback(
		async (groupId: string, attachedPolicyIds: string[]) => {
			if (!base) return false;
			try {
				await api().patch(`${base}/groups/${groupId}`, {
					attachedPolicyIds,
				});
				await mutateGroups();
				toast.push("Group updated", { type: "success" });
				return true;
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed to update group"), {
					type: "warn",
				});
				return false;
			}
		},
		[base, mutateGroups, toast],
	);

	const deleteGroup = useCallback(
		async (groupId: string) => {
			if (!base) return false;
			try {
				await api().delete(`${base}/groups/${groupId}`);
				await Promise.all([mutateGroups(), mutateMembers()]);
				toast.push("Group deleted", { type: "success" });
				return true;
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed to delete group"), {
					type: "warn",
				});
				return false;
			}
		},
		[base, mutateGroups, mutateMembers, toast],
	);

	const createPolicy = useCallback(
		async (name: string, document: IIamPolicyDocument) => {
			if (!base) return false;
			try {
				await api().post(`${base}/policies`, { name, document });
				await mutatePolicies();
				toast.push("Policy created", { type: "success" });
				return true;
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed to create policy"), {
					type: "warn",
				});
				return false;
			}
		},
		[base, mutatePolicies, toast],
	);

	const updatePolicy = useCallback(
		async (policyId: string, document: IIamPolicyDocument) => {
			if (!base) return false;
			try {
				await api().patch(`${base}/policies/${policyId}`, { document });
				await mutatePolicies();
				toast.push("Policy updated", { type: "success" });
				return true;
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed to update policy"), {
					type: "warn",
				});
				return false;
			}
		},
		[base, mutatePolicies, toast],
	);

	const deletePolicy = useCallback(
		async (policyId: string) => {
			if (!base) return false;
			try {
				await api().delete(`${base}/policies/${policyId}`);
				await Promise.all([mutatePolicies(), mutateGroups()]);
				toast.push("Policy deleted", { type: "success" });
				return true;
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed to delete policy"), {
					type: "warn",
				});
				return false;
			}
		},
		[base, mutatePolicies, mutateGroups, toast],
	);

	return {
		roster,
		ownerId,
		iamMembers,
		groups,
		policies,
		membershipMap,
		loading,
		forbidden,
		toggleMembership,
		createGroup,
		updateGroupPolicies,
		deleteGroup,
		createPolicy,
		updatePolicy,
		deletePolicy,
		refresh: () =>
			Promise.all([
				mutateRoster(),
				mutateMembers(),
				mutateGroups(),
				mutatePolicies(),
			]),
	};
}
