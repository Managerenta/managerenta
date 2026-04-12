"use client";
import { useMemo } from "react";
import { FiAlertCircle, FiUserCheck, FiUsers, FiUserX } from "react-icons/fi";
import useSWR from "swr";
import { fetcher } from "@/constants";
import type {
	IRawTenant,
	IRawTenantStats,
	ITenantListItem,
	ITenantStatItem,
} from "@/types";

function formatDate(iso: string): string {
	if (!iso) return "";
	return new Date(iso).toLocaleDateString("en-GB");
}

export default function useTenantsData(
	limit = 12,
	offset = 0,
	status = "all",
	search = "",
	sort = "name",
) {
	const params = new URLSearchParams({
		limit: String(limit),
		offset: String(offset),
		...(status !== "all" && { status }),
		...(search.trim() && { search: search.trim() }),
		...(sort && { sort }),
	});

	const url = `/api/tenants?${params.toString()}`;

	const {
		data: rawResponse,
		isLoading,
		mutate,
	} = useSWR<{
		data?: IRawTenant[];
		stats?: IRawTenantStats;
		total?: number;
	}>(url, fetcher, {
		revalidateOnMount: true,
		revalidateOnFocus: true,
	});

	const rawTenants: IRawTenant[] = rawResponse?.data ?? [];
	const rawStats: IRawTenantStats | null = rawResponse?.stats ?? null;
	const total: number = rawResponse?.total ?? 0;

	const tenants = useMemo<ITenantListItem[]>(() => {
		return rawTenants.map((p) => ({
			id: p._id,
			name: p.name,
			avatar: p.avatar ?? "",
			property: p.property,
			unit: p.unit,
			monthlyRent: `₦${p.monthlyRent.toLocaleString("en-NG")}/month`,
			paymentStatus: p.paymentStatus,
			moveInDate: formatDate(p.moveInDate),
			phone: p.phone,
			email: p.email,
			leaseExpiry: p.leaseExpiry ? formatDate(p.leaseExpiry) : "",
		}));
	}, [rawTenants]);

	const stats = useMemo<ITenantStatItem[]>(() => {
		const t = rawStats?.totalTenants ?? 0;
		const active = rawStats?.activeTenants ?? 0;
		const expiring = rawStats?.expiringLeases ?? 0;
		const overdue = rawStats?.overduePayments ?? 0;
		const activeRate = t > 0 ? Math.round((active / t) * 100) : 0;

		return [
			{
				id: "stat-001",
				label: "Total Tenants",
				value: String(t),
				subtext: "",
				subtextColor: "#16a34a",
				icon: <FiUsers size={18} />,
				iconBg: "#9cc3f6",
			},
			{
				id: "stat-002",
				label: "Active Tenants",
				value: String(active),
				subtext: `${activeRate}% active`,
				subtextColor: "#16a34a",
				icon: <FiUserCheck size={18} />,
				iconBg: "#86f5bb",
			},
			{
				id: "stat-003",
				label: "Expiring Leases",
				value: String(expiring),
				subtext: "Within 30 days",
				subtextColor: "#ca8a04",
				icon: <FiAlertCircle size={18} />,
				iconBg: "#f8e492",
			},
			{
				id: "stat-004",
				label: "Overdue Payments",
				value: String(overdue),
				subtext: overdue > 0 ? "Needs attention" : "All clear",
				subtextColor: overdue > 0 ? "#ef4444" : "#16a34a",
				icon: <FiUserX size={18} />,
				iconBg: "#f8a5a5",
			},
		];
	}, [rawStats]);

	const filterOptions = useMemo(
		() => [
			{ id: "filter-all", label: "All Tenants", value: "all" },
			{ id: "filter-paid", label: "Paid", value: "Paid" },
			{ id: "filter-due-soon", label: "Due Soon", value: "Due Soon" },
			{ id: "filter-overdue", label: "Overdue", value: "Overdue" },
		],
		[],
	);

	const sortOptions = useMemo(
		() => [
			{ id: "sort-name", label: "Name", value: "name" },
			{ id: "sort-property", label: "Property", value: "property" },
			{ id: "sort-rent", label: "Rent", value: "rent" },
			{ id: "sort-status", label: "Payment Status", value: "status" },
		],
		[],
	);

	return {
		tenants,
		stats,
		filterOptions,
		sortOptions,
		isLoading,
		mutate,
		total,
	};
}
