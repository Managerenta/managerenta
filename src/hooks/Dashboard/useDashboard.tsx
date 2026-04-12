"use client";
import { useMemo } from "react";
import {
	FiAlertCircle,
	FiBell,
	FiDownload,
	FiFileText,
	FiHome,
	FiLayers,
	FiPlus,
	FiUsers,
} from "react-icons/fi";
import useSWR from "swr";
import { fetcher } from "@/constants";
import type {
	IRawDashboardTransaction,
	IRawDashboardUrgentAction,
	ITenantAction,
	ITransaction,
} from "@/types";

interface IRawProperty {
	_id: string;
	name: string;
	address: string;
	totalUnits: number;
	occupied: number;
	monthlyRent: number;
	image?: string;
}

interface IRawDashboardStats {
	totalProperties?: number;
	totalUnits?: number;
	occupiedUnits?: number;
	vacantUnits?: number;
	urgentActions?: {
		dueToday?: IRawDashboardUrgentAction[];
		overdue?: IRawDashboardUrgentAction[];
	};
	recentTransactions?: IRawDashboardTransaction[];
}

interface IRawPropertiesResponse {
	data?: IRawProperty[];
}

function formatDate(iso: string): string {
	if (!iso) return "";
	return new Date(iso).toLocaleDateString("en-GB");
}

function formatNaira(amount: number): string {
	return `₦${amount.toLocaleString("en-NG")}`;
}

export default function useDashboardData() {
	const { data: dashboardStatsResponse } = useSWR<{
		data?: IRawDashboardStats;
	}>("/api/dashboard/stats", fetcher, { revalidateOnMount: true });
	const dashboardStats: IRawDashboardStats =
		dashboardStatsResponse?.data ?? {};

	const { data: propertiesData } = useSWR<IRawPropertiesResponse>(
		"/api/properties?limit=2",
		fetcher,
		{ revalidateOnMount: true },
	);

	const rawProperties: IRawProperty[] = propertiesData?.data ?? [];

	const stats = useMemo(() => {
		const totalProperties = dashboardStats?.totalProperties ?? 0;
		const totalUnits = dashboardStats?.totalUnits ?? 0;
		const occupiedUnits = dashboardStats?.occupiedUnits ?? 0;
		const vacantUnits = dashboardStats?.vacantUnits ?? 0;
		const occupancyRate =
			totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

		return [
			{
				id: "stat-001",
				label: "Total Properties",
				value: String(totalProperties),
				subtext: "",
				subtextColor: "#16a34a",
				icon: <FiHome size={18} />,
				iconBg: "#aac5e9",
			},
			{
				id: "stat-002",
				label: "Total Units",
				value: String(totalUnits),
				subtext: "",
				subtextColor: "#16a34a",
				icon: <FiLayers size={18} />,
				iconBg: "#e1d295",
			},
			{
				id: "stat-003",
				label: "Occupied Units",
				value: String(occupiedUnits),
				subtext: `${occupancyRate}% occupancy`,
				subtextColor: "#64748b",
				icon: <FiUsers size={18} />,
				iconBg: "#a3e9c5",
			},
			{
				id: "stat-004",
				label: "Vacant Units",
				value: String(vacantUnits),
				subtext: `${100 - occupancyRate}% vacancy`,
				subtextColor: "#586d89",
				icon: <FiAlertCircle size={18} />,
				iconBg: "#e9e295",
			},
		];
	}, [dashboardStats]);

	const listedProperties = useMemo(() => {
		return rawProperties.map((p) => ({
			id: p._id,
			name: p.name,
			location: p.address,
			totalUnits: p.totalUnits,
			occupied: p.occupied ?? 0,
			monthlyRevenue: `₦${p.monthlyRent.toLocaleString("en-NG")}/mo`,
			image: p.image ?? "",
		}));
	}, [rawProperties]);

	const dueToday = useMemo<ITenantAction[]>(() => {
		const raw: IRawDashboardUrgentAction[] =
			dashboardStats?.urgentActions?.dueToday ?? [];
		return raw.map((a) => ({
			id: a.tenantId,
			tenantId: a.tenantId,
			name: a.name,
			property: `${a.propertyName}, ${a.unitName}`,
			amount: formatNaira(a.amount),
			avatar: a.avatar ?? "",
			phone: a.phone,
		}));
	}, [dashboardStats]);

	const overdue = useMemo<ITenantAction[]>(() => {
		const raw: IRawDashboardUrgentAction[] =
			dashboardStats?.urgentActions?.overdue ?? [];
		return raw.map((a) => ({
			id: a.tenantId,
			tenantId: a.tenantId,
			name: a.name,
			property: `${a.propertyName}, ${a.unitName}`,
			amount: formatNaira(a.amount),
			avatar: a.avatar ?? "",
			phone: a.phone,
			overdueDays: a.overdueDays ?? 0,
		}));
	}, [dashboardStats]);

	const urgentActionCount = dueToday.length + overdue.length;

	const transactions = useMemo<ITransaction[]>(() => {
		const raw: IRawDashboardTransaction[] =
			dashboardStats?.recentTransactions ?? [];
		return raw.map((t) => ({
			id: t._id,
			tenantId: t.tenantId,
			name: t.tenantName,
			date: formatDate(t.date),
			unit: t.unitName,
			amount: formatNaira(t.amount),
			type: t.type,
		}));
	}, [dashboardStats]);

	const quickActions = useMemo(() => {
		return [
			{ label: "Add Property", icon: <FiPlus size={18} /> },
			{ label: "Record Transaction", icon: <FiFileText size={18} /> },
			{ label: "Send Reminders", icon: <FiBell size={18} /> },
			{ label: "Export Report", icon: <FiDownload size={18} /> },
		];
	}, []);

	return {
		stats,
		dueToday,
		overdue,
		urgentActionCount,
		transactions,
		listedProperties,
		quickActions,
	};
}
