"use client";
import { useMemo } from "react";
import { BsCurrencyDollar } from "react-icons/bs";
import { FiHome, FiLayers, FiTrendingUp } from "react-icons/fi";
import useSWR from "swr";
import { fetcher } from "@/constants";
import type { IPropertyList, IPropertyStatItem } from "@/types";

interface IRawProperty {
	_id: string;
	name: string;
	address: string;
	type: string;
	totalUnits: number;
	occupied?: number;
	monthlyRent?: number;
	image?: string;
	createdAt: string;
}

interface IRawPropertiesResponse {
	data?: IRawProperty[];
	stats?: {
		totalProperties?: number;
		totalUnits?: number;
		totalOccupied?: number;
		totalMonthlyRent?: number;
	};
	total?: number;
}

function computeOccupancyStatus(
	occupied: number,
	totalUnits: number,
): "Excellent" | "Good" | "Needs Attention" {
	if (totalUnits === 0) return "Needs Attention";
	const rate = occupied / totalUnits;
	if (rate >= 0.9) return "Excellent";
	if (rate >= 0.7) return "Good";
	return "Needs Attention";
}

function computeTypeBadgeColor(type: string): string {
	const map: Record<string, string> = {
		Apartment: "#2563eb",
		House: "#7c3aed",
		Commercial: "#059669",
		Land: "#d97706",
		Studio: "#db2777",
		Duplex: "#db2777",
		Bungalow: "#d97706",
		"High-rise": "#0284c7",
	};
	return map[type] ?? "#64748b";
}

export default function usePropertiesData(limit = 20, offset = 0) {
	const url = `/api/properties?limit=${limit}&offset=${offset}`;

	const {
		data: rawResponse,
		isLoading,
		mutate,
	} = useSWR<IRawPropertiesResponse>(url, fetcher, {
		revalidateOnMount: true,
	});

	const rawProperties = useMemo<IRawProperty[]>(
		() => rawResponse?.data ?? [],
		[rawResponse],
	);
	const rawStats = useMemo(() => rawResponse?.stats ?? null, [rawResponse]);

	const properties = useMemo<IPropertyList[]>(() => {
		return rawProperties.map((p) => {
			const occupied = p.occupied ?? 0;
			const vacant = p.totalUnits - occupied;
			return {
				id: p._id,
				name: p.name,
				address: p.address,
				type: p.type,
				typeBadgeColor: computeTypeBadgeColor(p.type),
				totalUnits: p.totalUnits,
				occupied,
				vacant,
				monthlyRevenue: `₦${(p.monthlyRent ?? 0).toLocaleString("en-NG")}/month`,
				occupancyStatus: computeOccupancyStatus(occupied, p.totalUnits),
				image: p.image ?? "",
			};
		});
	}, [rawProperties]);

	const stats = useMemo<IPropertyStatItem[]>(() => {
		const total = rawStats?.totalProperties ?? 0;
		const totalUnits = rawStats?.totalUnits ?? 0;
		const totalOccupied = rawStats?.totalOccupied ?? 0;
		const totalMonthlyRent = rawStats?.totalMonthlyRent ?? 0;
		const occupancyRate =
			totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;

		return [
			{
				id: "stat-001",
				label: "Total Properties",
				value: String(total),
				subtext: "",
				subtextColor: "#16a34a",
				icon: <FiHome size={18} />,
				iconBg: "#aac5e9",
			},
			{
				id: "stat-002",
				label: "Total Units",
				value: String(totalUnits),
				subtext: "Across all properties",
				subtextColor: "#64748b",
				icon: <FiLayers size={18} />,
				iconBg: "#e1d295",
			},
			{
				id: "stat-003",
				label: "Occupancy Rate",
				value: `${occupancyRate}%`,
				subtext: "",
				subtextColor: "#64748b",
				icon: <FiTrendingUp size={18} />,
				iconBg: "#a3e9c5",
				progressBar: { value: occupancyRate, color: "#0ea5e9" },
			},
			{
				id: "stat-004",
				label: "Monthly Rent Expected",
				value: `₦${totalMonthlyRent.toLocaleString("en-NG")}`,
				subtext: "",
				subtextColor: "#16a34a",
				icon: <BsCurrencyDollar size={18} />,
				iconBg: "#e9e295",
			},
		];
	}, [rawStats]);

	const filterOptions = useMemo(
		() => [
			{ id: "filter-all", label: "All Properties", value: "all" },
			{ id: "filter-apartment", label: "Apartment", value: "Apartment" },
			{ id: "filter-house", label: "House", value: "House" },
			{
				id: "filter-commercial",
				label: "Commercial",
				value: "Commercial",
			},
			{ id: "filter-land", label: "Land", value: "Land" },
			{ id: "filter-studio", label: "Studio", value: "Studio" },
			{ id: "filter-duplex", label: "Duplex", value: "Duplex" },
			{ id: "filter-bungalow", label: "Bungalow", value: "Bungalow" },
			{ id: "filter-highrise", label: "High-rise", value: "High-rise" },
		],
		[],
	);

	const sortOptions = useMemo(
		() => [
			{ id: "sort-name", label: "Name", value: "name" },
			{ id: "sort-occupancy", label: "Occupancy", value: "occupancy" },
			{ id: "sort-revenue", label: "Revenue", value: "revenue" },
			{ id: "sort-units", label: "Units", value: "units" },
		],
		[],
	);

	return {
		properties,
		stats,
		filterOptions,
		sortOptions,
		isLoading,
		mutate,
		total: rawResponse?.total ?? rawProperties.length,
	};
}
