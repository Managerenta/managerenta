"use client";
import { useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import useSWR from "swr";
import { api, fetcher, getErrorMessage } from "@/constants";

export interface IOrgListItem {
	_id: string;
	id?: string;
	name: string;
	description?: string;
	logo?: string | null;
	ownerId: string;
	members: { memberId: string; permission: "admin" | "manager" | "viewer" }[];
}

interface ListResponse {
	data?: {
		organizations: IOrgListItem[];
		currentOrganizationId: string | null;
		role: "admin" | "manager" | "viewer" | null;
	};
}

export default function useOrganizations() {
	const { data, mutate, isLoading } = useSWR<ListResponse>(
		"/api/organizations",
		fetcher,
		{ revalidateOnMount: true },
	);

	const organizations = useMemo<IOrgListItem[]>(
		() => data?.data?.organizations ?? [],
		[data],
	);
	const currentOrganizationId = data?.data?.currentOrganizationId ?? null;
	const role = data?.data?.role ?? null;

	const current = useMemo<IOrgListItem | null>(() => {
		if (!currentOrganizationId) return null;
		return (
			organizations.find(
				(o) =>
					o._id === currentOrganizationId ||
					o.id === currentOrganizationId,
			) ?? null
		);
	}, [organizations, currentOrganizationId]);

	const switchTo = useCallback(
		async (organizationId: string | null) => {
			try {
				await api().post("/api/organizations/switch", {
					organizationId,
				});
				await mutate();
				toast.success(
					organizationId
						? "Switched organization"
						: "Switched to personal workspace",
				);
				return true;
			} catch (err) {
				toast.error(getErrorMessage(err, "Failed to switch"));
				return false;
			}
		},
		[mutate],
	);

	const create = useCallback(
		async (payload: { name: string; description: string; logo?: File }) => {
			try {
				const fd = new FormData();
				fd.append("name", payload.name);
				fd.append("description", payload.description);
				if (payload.logo) fd.append("logo", payload.logo);
				await api().post("/api/organizations", fd);
				await mutate();
				toast.success("Organization created");
				return true;
			} catch (err) {
				toast.error(getErrorMessage(err, "Failed to create"));
				return false;
			}
		},
		[mutate],
	);

	return {
		organizations,
		currentOrganizationId,
		current,
		role,
		switchTo,
		create,
		mutate,
		isLoading,
	};
}
