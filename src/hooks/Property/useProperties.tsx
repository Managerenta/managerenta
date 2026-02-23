"use client";
import { useMemo } from "react";
import { BsCurrencyDollar } from "react-icons/bs";
import { FiHome, FiLayers, FiTrendingUp } from "react-icons/fi";
import type { IPropertyList, IPropertyStatItem } from "@/types";

export default function usePropertiesData() {
	const properties = useMemo<IPropertyList[]>(() => {
		return [
			{
				id: "prop-001",
				name: "Sunrise Apartments",
				address: "15 Admiralty Way, Lekki Phase 1, Lagos",
				type: "Apartment Building",
				typeBadgeColor: "#2563eb",
				totalUnits: 24,
				occupied: 22,
				vacant: 2,
				monthlyRevenue: "₦720,000/month",
				occupancyStatus: "Excellent",
				image: "/images/properties/sunrise-apartments.webp",
			},
			{
				id: "prop-002",
				name: "Garden View Duplex",
				address: "8 Banana Island Road, Ikoyi, Lagos",
				type: "Duplex",
				typeBadgeColor: "#db2777",
				totalUnits: 1,
				occupied: 1,
				vacant: 0,
				monthlyRevenue: "₦450,000/month",
				occupancyStatus: "Excellent",
				image: "/images/properties/garden-view.webp",
			},
			{
				id: "prop-003",
				name: "Metro Plaza",
				address: "45 Adeola Odeku Street, Victoria Island, Lagos",
				type: "Office Building",
				typeBadgeColor: "#059669",
				totalUnits: 12,
				occupied: 8,
				vacant: 4,
				monthlyRevenue: "₦960,000/month",
				occupancyStatus: "Good",
				image: "/images/properties/metro-plaza.webp",
			},
			{
				id: "prop-004",
				name: "Greenfield Estate",
				address: "Plot 23, Chevron Drive, Lekki, Lagos",
				type: "Residential Estate",
				typeBadgeColor: "#7c3aed",
				totalUnits: 36,
				occupied: 30,
				vacant: 6,
				monthlyRevenue: "₦1,080,000/month",
				occupancyStatus: "Good",
				image: "/images/properties/greenfield.webp",
			},
			{
				id: "prop-005",
				name: "Serenity Bungalows",
				address: "12 Oregun Road, Ikeja, Lagos",
				type: "Bungalow",
				typeBadgeColor: "#d97706",
				totalUnits: 8,
				occupied: 6,
				vacant: 2,
				monthlyRevenue: "₦320,000/month",
				occupancyStatus: "Good",
				image: "/images/properties/serenity.webp",
			},
			{
				id: "prop-006",
				name: "Skyline Towers",
				address: "3 Tiamiyu Savage Street, Victoria Island, Lagos",
				type: "High-rise",
				typeBadgeColor: "#0284c7",
				totalUnits: 48,
				occupied: 20,
				vacant: 28,
				monthlyRevenue: "₦1,440,000/month",
				occupancyStatus: "Needs Attention",
				image: "/images/properties/skyline.webp",
			},
		];
	}, []);

	const stats = useMemo<IPropertyStatItem[]>(() => {
		return [
			{
				id: "stat-001",
				label: "Total Properties",
				value: "24",
				subtext: "+2 this month",
				subtextColor: "#16a34a",
				icon: <FiHome size={18} />,
				iconBg: "#dbeafe",
			},
			{
				id: "stat-002",
				label: "Total Units",
				value: "156",
				subtext: "Across all properties",
				subtextColor: "#64748b",
				icon: <FiLayers size={18} />,
				iconBg: "#fef3c7",
			},
			{
				id: "stat-003",
				label: "Occupancy Rate",
				value: "87%",
				subtext: "",
				subtextColor: "#64748b",
				icon: <FiTrendingUp size={18} />,
				iconBg: "#d1fae5",
				progressBar: { value: 87, color: "#0ea5e9" },
			},
			{
				id: "stat-004",
				label: "Monthly Rent Expected",
				value: "₦4,850,000",
				subtext: "+₦125,000 vs last month",
				subtextColor: "#16a34a",
				icon: <BsCurrencyDollar size={18} />,
				iconBg: "#fef9c3",
			},
		];
	}, []);

	const filterOptions = useMemo(() => {
		return [
			{ id: "filter-all", label: "All Properties", value: "all" },
			{ id: "filter-apartment", label: "Apartment", value: "apartment" },
			{ id: "filter-duplex", label: "Duplex", value: "duplex" },
			{ id: "filter-office", label: "Office Building", value: "office" },
			{ id: "filter-bungalow", label: "Bungalow", value: "bungalow" },
			{ id: "filter-highrise", label: "High-rise", value: "highrise" },
		];
	}, []);

	const sortOptions = useMemo(() => {
		return [
			{ id: "sort-name", label: "Name", value: "name" },
			{ id: "sort-occupancy", label: "Occupancy", value: "occupancy" },
			{ id: "sort-revenue", label: "Revenue", value: "revenue" },
			{ id: "sort-units", label: "Units", value: "units" },
		];
	}, []);

	return {
		properties,
		stats,
		filterOptions,
		sortOptions,
	};
}
