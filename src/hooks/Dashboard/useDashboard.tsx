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
import type { ITenantAction, ITransaction } from "@/types";

export default function useDashboardData() {
	const stats = useMemo(() => {
		return [
			{
				id: "stat-001",
				label: "Total Properties",
				value: "24",
				subtext: "↑ +2 this month",
				subtextColor: "#16a34a",
				icon: <FiHome size={18} />,
				iconBg: "#dbeafe",
			},
			{
				id: "stat-002",
				label: "Total Units",
				value: "156",
				subtext: "↑ +8 this month",
				subtextColor: "#16a34a",
				icon: <FiLayers size={18} />,
				iconBg: "#fef3c7",
			},
			{
				id: "stat-003",
				label: "Occupied Units",
				value: "142",
				subtext: "91% occupancy",
				subtextColor: "#64748b",
				icon: <FiUsers size={18} />,
				iconBg: "#d1fae5",
			},
			{
				id: "stat-004",
				label: "Vacant Units",
				value: "14",
				subtext: "9% vacancy",
				subtextColor: "#64748b",
				icon: <FiAlertCircle size={18} />,
				iconBg: "#fef9c3",
			},
		];
	}, []);

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

	const listedProperties = useMemo(() => {
		return [
			{
				id: "prop-001",
				name: "Lagos Estate",
				location: "Victoria Island, Lagos",
				totalUnits: 24,
				occupied: 22,
				monthlyRevenue: "₦8,400,000/mo",
				image: "/images/properties/lagos-estate.webp",
			},
			{
				id: "prop-002",
				name: "Victoria Garden City",
				location: "Ajah, Lagos",
				totalUnits: 18,
				occupied: 16,
				monthlyRevenue: "₦5,760,000/mo",
				image: "/images/properties/victoria-garden.webp",
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
