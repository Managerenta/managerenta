"use client";
import { useContext, useMemo } from "react";
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
import { api } from "@/constants";
import { AppContextProvider } from "@/hooks";
import type { ITenantAction, ITransaction } from "@/types";

interface IRawProperty {
	_id: string;
	name: string;
	address: string;
	totalUnits: number;
	occupied: number;
	monthlyRent: number;
	image?: string;
}

export default function useDashboardData() {
	const { env } = useContext(AppContextProvider);

	const { data: dashboardStats } = useSWR(
		`${env.MAIN_SERVICE_URL}/api/dashboard/stats`,
		(u: string) =>
			api()
				.get(u)
				.then((r) => r.data?.data ?? r.data),
		{ revalidateOnMount: true },
	);

	const { data: propertiesData } = useSWR(
		`${env.MAIN_SERVICE_URL}/api/properties?limit=2`,
		(u: string) =>
			api()
				.get(u)
				.then((r) => r.data),
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
		return [
			{
				id: "tenant-001",
				name: "Chioma Okoro",
				property: "Lagos Estate, Unit 12A",
				amount: "₦450,000",
				avatar: "/images/tenants/chioma.webp",
			},
			{
				id: "tenant-002",
				name: "Emeka Nwosu",
				property: "Victoria Garden, Unit 5B",
				amount: "₦320,000",
				avatar: "/images/tenants/emeka.webp",
			},
		];
	}, []);

	const overdue = useMemo<ITenantAction[]>(() => {
		return [
			{
				id: "tenant-003",
				name: "Funmi Adebayo",
				property: "Ikoyi Heights, Unit 8C",
				amount: "₦380,000",
				avatar: "/images/tenants/funmi.webp",
				overdueDays: 5,
			},
			{
				id: "tenant-004",
				name: "Tunde Balogun",
				property: "Lekki Phase 2, Unit 4B",
				amount: "₦380,000",
				avatar: "/images/tenants/tunde.webp",
				overdueDays: 5,
			},
		];
	}, []);

	const transactions = useMemo<ITransaction[]>(() => {
		return [
			{
				id: "tx-001",
				name: "Kemi Ajayi",
				date: "15/12/2024",
				unit: "Unit 3A",
				amount: "₦450,000",
				type: "credit",
			},
			{
				id: "tx-002",
				name: "David Okonkwo",
				date: "14/12/2024",
				unit: "Unit 7B",
				amount: "₦320,000",
				type: "credit",
			},
			{
				id: "tx-003",
				name: "Maintenance Fee",
				date: "13/12/2024",
				unit: "General",
				amount: "₦75,000",
				type: "debit",
			},
			{
				id: "tx-004",
				name: "Sarah Ibrahim",
				date: "12/12/2024",
				unit: "Unit 15C",
				amount: "₦380,000",
				type: "credit",
			},
			{
				id: "tx-005",
				name: "Michael Eze",
				date: "11/12/2024",
				unit: "Unit 9A",
				amount: "₦500,000",
				type: "credit",
			},
		];
	}, []);

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
		transactions,
		listedProperties,
		quickActions,
	};
}
