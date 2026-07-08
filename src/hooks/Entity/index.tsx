"use client";
import { useMemo } from "react";
import useSWR from "swr";
import type { ISelectOption } from "@/components";
import { fetcher } from "@/constants";
import type {
	IAuditEvent,
	IDocumentItem,
	IMaintenanceRequest,
	IMaintenanceStats,
	IVendor,
} from "@/types";

interface IEnvelope<T> {
	data?: T;
}

export interface IAnalytics {
	summary: {
		totalProperties: number;
		totalUnits: number;
		occupiedUnits: number;
		vacantUnits: number;
		occupancyRate: number;
		totalTenants: number;
		totalMonthlyRevenue: number;
		monthlyCollected: number;
		monthlyExpected: number;
		collectionRate: number;
	};
	monthly: { month: string; revenue: number; expenses: number }[];
	occupancyByProperty: {
		propertyId: string;
		name: string;
		occupied: number;
		total: number;
		rate: number;
	}[];
	maintenanceCost: { category: string; total: number }[];
}

export function useAnalytics(months = 6) {
	const { data, isLoading } = useSWR<IEnvelope<IAnalytics>>(
		`/api/analytics?months=${months}`,
		fetcher,
		// The global SWRConfig disables revalidateOnMount; without this the
		// page never fetches on first visit.
		{ revalidateOnMount: true },
	);
	return { analytics: data?.data, isLoading };
}

/**
 * Property options for select inputs in the maintenance / documents forms.
 * Returns react-select options plus a propertyId -> name map for display.
 */
export function usePropertyOptions() {
	const { data } = useSWR<{
		data?: { _id: string; id?: string; name: string }[];
	}>("/api/properties?limit=100", fetcher, { revalidateOnMount: true });

	return useMemo(() => {
		const list = data?.data ?? [];
		const options: ISelectOption[] = list.map((p) => ({
			label: p.name,
			value: p._id ?? p.id ?? "",
		}));
		const nameById: Record<string, string> = {};
		for (const p of list) nameById[p._id ?? p.id ?? ""] = p.name;
		return { options, nameById };
	}, [data]);
}

export function useMaintenance(params: {
	status?: string;
	priority?: string;
	search?: string;
	limit?: number;
	offset?: number;
}) {
	const qs = new URLSearchParams();
	qs.set("limit", String(params.limit ?? 50));
	qs.set("offset", String(params.offset ?? 0));
	if (params.status && params.status !== "all")
		qs.set("status", params.status);
	if (params.priority && params.priority !== "all")
		qs.set("priority", params.priority);
	if (params.search?.trim()) qs.set("search", params.search.trim());

	const { data, isLoading, mutate } = useSWR<
		IEnvelope<{
			requests: IMaintenanceRequest[];
			total: number;
			stats: IMaintenanceStats;
		}>
	>(`/api/maintenance?${qs.toString()}`, fetcher, {
		revalidateOnMount: true,
	});

	return {
		requests: data?.data?.requests ?? [],
		total: data?.data?.total ?? 0,
		stats: data?.data?.stats ?? {
			open: 0,
			inProgress: 0,
			completed: 0,
			total: 0,
		},
		isLoading,
		mutate,
	};
}

export function useVendors(params: { specialty?: string; search?: string }) {
	const qs = new URLSearchParams();
	qs.set("limit", "100");
	if (params.specialty && params.specialty !== "all")
		qs.set("specialty", params.specialty);
	if (params.search?.trim()) qs.set("search", params.search.trim());

	const { data, isLoading, mutate } = useSWR<
		IEnvelope<{ vendors: IVendor[]; total: number }>
	>(`/api/vendors?${qs.toString()}`, fetcher, { revalidateOnMount: true });

	return {
		vendors: data?.data?.vendors ?? [],
		total: data?.data?.total ?? 0,
		isLoading,
		mutate,
	};
}

export function useVendorOptions() {
	const { vendors } = useVendors({});
	return useMemo<ISelectOption[]>(
		() => vendors.map((v) => ({ label: v.name, value: v.id })),
		[vendors],
	);
}

export function useDocuments(params: {
	category?: string;
	propertyId?: string;
	search?: string;
}) {
	const qs = new URLSearchParams();
	qs.set("limit", "100");
	if (params.category && params.category !== "all")
		qs.set("category", params.category);
	if (params.propertyId) qs.set("propertyId", params.propertyId);
	if (params.search?.trim()) qs.set("search", params.search.trim());

	const { data, isLoading, mutate } = useSWR<
		IEnvelope<{ documents: IDocumentItem[]; total: number }>
	>(`/api/documents?${qs.toString()}`, fetcher, { revalidateOnMount: true });

	return {
		documents: data?.data?.documents ?? [],
		total: data?.data?.total ?? 0,
		isLoading,
		mutate,
	};
}

export type ICalendarEventType = "rent-due" | "lease-expiry" | "maintenance";

export interface ICalendarEvent {
	date: string;
	type: ICalendarEventType;
	title: string;
	subtitle?: string;
	refId?: string;
}

export function useCalendar(year: number, month: number) {
	const { data, isLoading } = useSWR<IEnvelope<{ events: ICalendarEvent[] }>>(
		`/api/calendar?year=${year}&month=${month}`,
		fetcher,
		{ revalidateOnMount: true },
	);
	return { events: data?.data?.events ?? [], isLoading };
}

export function useAudit(params: { entityType?: string; action?: string }) {
	const qs = new URLSearchParams();
	qs.set("limit", "100");
	if (params.entityType && params.entityType !== "all")
		qs.set("entityType", params.entityType);
	if (params.action && params.action !== "all")
		qs.set("action", params.action);

	const { data, isLoading, mutate } = useSWR<
		IEnvelope<{ events: IAuditEvent[]; total: number }>
	>(`/api/audit?${qs.toString()}`, fetcher, { revalidateOnMount: true });

	return {
		events: data?.data?.events ?? [],
		total: data?.data?.total ?? 0,
		isLoading,
		mutate,
	};
}
