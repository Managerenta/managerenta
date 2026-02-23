"use client";
import { useMemo } from "react";
import { FiAlertCircle, FiHome, FiLayers, FiUsers } from "react-icons/fi";
import type { IPropertyDetail, IPropertyUnit, ITopTenant } from "@/types";

export default function usePropertyDetailData(propertyId: string | null) {
	const propertyDetail = useMemo<IPropertyDetail | null>(() => {
		if (!propertyId) return null;

		return {
			id: "prop-001",
			name: "Sunrise Apartments",
			address: "15 Admiralty Way, Lekki Phase 1, Lagos",
			type: "Apartment Building",
			dateAdded: "15/03/2024",
			monthlyRentTotal: "₦17,280,000",
			totalUnits: 24,
			occupied: 22,
			vacant: 2,
			occupancyRate: 92,
			units: [],
		};
	}, [propertyId]);

	const units = useMemo<IPropertyUnit[]>(() => {
		if (!propertyId) return [];

		return [
			{
				id: "unit-001",
				name: "Block A, Flat 1",
				status: "Occupied",
				tenantName: "Kemi Ajayi",
				tenantAvatar: "/images/tenants/kemi.webp",
				rent: "₦720,000/month",
				dueDate: "Due: 01/01/2025",
				paymentStatus: "Paid",
			},
			{
				id: "unit-002",
				name: "Block A, Flat 2",
				status: "Occupied",
				tenantName: "David Okonkwo",
				tenantAvatar: "/images/tenants/david.webp",
				rent: "₦720,000/month",
				dueDate: "Due: 28/12/2024",
				paymentStatus: "Due Soon",
			},
			{
				id: "unit-003",
				name: "Block A, Flat 3",
				status: "Occupied",
				tenantName: "Funmi Adebayo",
				tenantAvatar: "/images/tenants/funmi.webp",
				rent: "₦720,000/month",
				dueDate: "Due: 10/12/2024",
				paymentStatus: "Overdue",
			},
			{
				id: "unit-004",
				name: "Block B, Flat 1",
				status: "Vacant",
				rent: "₦720,000/month",
				vacantDays: 15,
			},
			{
				id: "unit-005",
				name: "Block B, Flat 2",
				status: "Vacant",
				rent: "₦720,000/month",
				vacantDays: 8,
			},
			{
				id: "unit-006",
				name: "Block A, Flat 4",
				status: "Occupied",
				tenantName: "Sarah Ibrahim",
				tenantAvatar: "/images/tenants/sarah.webp",
				rent: "₦720,000/month",
				dueDate: "Due: 15/01/2025",
				paymentStatus: "Paid",
			},
		];
	}, [propertyId]);

	const detailStats = useMemo(() => {
		if (!propertyDetail) return [];

		return [
			{
				id: "stat-001",
				label: "Total Units",
				value: String(propertyDetail.totalUnits),
				subtext: "",
				subtextColor: "#64748b",
				icon: <FiHome size={18} />,
				iconBg: "#dbeafe",
			},
			{
				id: "stat-002",
				label: "Occupied Units",
				value: String(propertyDetail.occupied),
				subtext: `${propertyDetail.occupancyRate}% occupied`,
				subtextColor: "#16a34a",
				icon: <FiUsers size={18} />,
				iconBg: "#d1fae5",
			},
			{
				id: "stat-003",
				label: "Vacant Units",
				value: String(propertyDetail.vacant),
				subtext: `${100 - propertyDetail.occupancyRate}% vacant`,
				subtextColor: "#ef4444",
				icon: <FiAlertCircle size={18} />,
				iconBg: "#fee2e2",
			},
			{
				id: "stat-004",
				label: "Monthly Rent Total",
				value: propertyDetail.monthlyRentTotal,
				subtext: "",
				subtextColor: "#64748b",
				icon: <FiLayers size={18} />,
				iconBg: "#d1fae5",
			},
		];
	}, [propertyDetail]);

	const topTenants = useMemo<ITopTenant[]>(() => {
		return [
			{ id: "tt-001", name: "Kemi Ajayi", amount: "₦720,000" },
			{ id: "tt-002", name: "David Okonkwo", amount: "₦720,000" },
			{ id: "tt-003", name: "Sarah Ibrahim", amount: "₦720,000" },
		];
	}, []);

	return {
		propertyDetail,
		units,
		detailStats,
		topTenants,
	};
}
