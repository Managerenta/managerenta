"use client";
import useSWR from "swr";
import { fetcher } from "@/constants";

export interface IAdminAuditEvent {
	id: string;
	ownerId?: string;
	actorId?: string;
	organizationId?: string;
	action: string;
	entityType: string;
	entityId?: string;
	description?: string;
	ip?: string;
	createdAt: string;
}

export interface IAdminAuditList {
	events: IAdminAuditEvent[];
	total: number;
}

export function useAdminAudit({
	action,
	entityType,
}: {
	action: string;
	entityType: string;
}) {
	const params = new URLSearchParams({ limit: "50" });
	if (action && action !== "all") params.set("action", action);
	if (entityType && entityType !== "all") params.set("entityType", entityType);
	const { data, isLoading } = useSWR<{ data?: IAdminAuditList }>(
		`/api/admin/audit?${params.toString()}`,
		fetcher,
	);
	return {
		events: data?.data?.events ?? [],
		total: data?.data?.total ?? 0,
		isLoading,
	};
}
