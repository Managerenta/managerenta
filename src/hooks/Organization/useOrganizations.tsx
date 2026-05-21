"use client";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { api, fetcher, getErrorMessage } from "@/constants";
import { useToast } from "../useToast";

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
	const toast = useToast();
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
				toast.push(
					organizationId
						? "Switched organization"
						: "Switched to personal workspace",
					{ type: "success" },
				);
				return true;
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed to switch"), {
					type: "warn",
				});
				return false;
			}
		},
		[mutate, toast],
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
				toast.push("Organization created", { type: "success" });
				return true;
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed to create"), {
					type: "warn",
				});
				return false;
			}
		},
		[mutate, toast],
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
