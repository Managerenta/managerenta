"use client";
import { useMemo } from "react";
import { FiAlertCircle, FiUserCheck, FiUsers, FiUserX } from "react-icons/fi";
import type { ITenantListItem, ITenantStatItem } from "@/types";

export default function useTenantsData() {
	const tenants = useMemo<ITenantListItem[]>(() => {
		return [
			{
				id: "tenant-001",
				name: "Chioma Okoro",
				avatar: "/images/tenants/chioma.webp",
				property: "Sunrise Apartments",
				unit: "Block A, Flat 2",
				monthlyRent: "₦450,000",
				paymentStatus: "Overdue",
				moveInDate: "15/01/2022",
				phone: "+234 803 123 4567",
				email: "chioma.okoro@email.com",
				leaseExpiry: "15/01/2026",
			},
			{
				id: "tenant-002",
				name: "Kemi Ajayi",
				avatar: "/images/tenants/kemi.webp",
				property: "Sunrise Apartments",
				unit: "Block A, Flat 1",
				monthlyRent: "₦720,000",
				paymentStatus: "Paid",
				moveInDate: "01/03/2023",
				phone: "+234 805 678 9012",
				email: "kemi.ajayi@email.com",
				leaseExpiry: "01/03/2026",
			},
			{
				id: "tenant-003",
				name: "David Okonkwo",
				avatar: "/images/tenants/david.webp",
				property: "Sunrise Apartments",
				unit: "Block A, Flat 2",
				monthlyRent: "₦720,000",
				paymentStatus: "Due Soon",
				moveInDate: "10/06/2023",
				phone: "+234 807 345 6789",
				email: "david.okonkwo@email.com",
				leaseExpiry: "10/06/2026",
			},
			{
				id: "tenant-004",
				name: "Funmi Adebayo",
				avatar: "/images/tenants/funmi.webp",
				property: "Sunrise Apartments",
				unit: "Block A, Flat 3",
				monthlyRent: "₦720,000",
				paymentStatus: "Overdue",
				moveInDate: "20/09/2022",
				phone: "+234 809 012 3456",
				email: "funmi.adebayo@email.com",
				leaseExpiry: "20/09/2025",
			},
			{
				id: "tenant-005",
				name: "Sarah Ibrahim",
				avatar: "/images/tenants/sarah.webp",
				property: "Sunrise Apartments",
				unit: "Block A, Flat 4",
				monthlyRent: "₦720,000",
				paymentStatus: "Paid",
				moveInDate: "05/04/2024",
				phone: "+234 802 456 7890",
				email: "sarah.ibrahim@email.com",
				leaseExpiry: "05/04/2027",
			},
			{
				id: "tenant-006",
				name: "Emeka Nwosu",
				avatar: "/images/tenants/emeka.webp",
				property: "Garden View Duplex",
				unit: "Main Unit",
				monthlyRent: "₦450,000",
				paymentStatus: "Paid",
				moveInDate: "12/11/2023",
				phone: "+234 811 234 5678",
				email: "emeka.nwosu@email.com",
				leaseExpiry: "12/11/2026",
			},
			{
				id: "tenant-007",
				name: "Tunde Balogun",
				avatar: "/images/tenants/tunde.webp",
				property: "Greenfield Estate",
				unit: "Unit 4B",
				monthlyRent: "₦380,000",
				paymentStatus: "Due Soon",
				moveInDate: "01/08/2023",
				phone: "+234 813 567 8901",
				email: "tunde.balogun@email.com",
				leaseExpiry: "01/08/2026",
			},
			{
				id: "tenant-008",
				name: "Ngozi Eze",
				avatar: "/images/tenants/ngozi.webp",
				property: "Metro Plaza",
				unit: "Suite 5A",
				monthlyRent: "₦960,000",
				paymentStatus: "Paid",
				moveInDate: "18/02/2024",
				phone: "+234 815 890 1234",
				email: "ngozi.eze@email.com",
				leaseExpiry: "18/02/2027",
			},
		];
	}, []);

	const stats = useMemo<ITenantStatItem[]>(() => {
		return [
			{
				id: "stat-001",
				label: "Total Tenants",
				value: "142",
				subtext: "+5 this month",
				subtextColor: "#16a34a",
				icon: <FiUsers size={18} />,
				iconBg: "#dbeafe",
			},
			{
				id: "stat-002",
				label: "Active Tenants",
				value: "138",
				subtext: "97% active",
				subtextColor: "#16a34a",
				icon: <FiUserCheck size={18} />,
				iconBg: "#d1fae5",
			},
			{
				id: "stat-003",
				label: "Expiring Leases",
				value: "8",
				subtext: "Within 3 months",
				subtextColor: "#ca8a04",
				icon: <FiAlertCircle size={18} />,
				iconBg: "#fef3c7",
			},
			{
				id: "stat-004",
				label: "Overdue Payments",
				value: "12",
				subtext: "₦4,560,000 outstanding",
				subtextColor: "#ef4444",
				icon: <FiUserX size={18} />,
				iconBg: "#fee2e2",
			},
		];
	}, []);

	const filterOptions = useMemo(() => {
		return [
			{ id: "filter-all", label: "All Tenants", value: "all" },
			{ id: "filter-paid", label: "Paid", value: "paid" },
			{ id: "filter-due-soon", label: "Due Soon", value: "due-soon" },
			{ id: "filter-overdue", label: "Overdue", value: "overdue" },
		];
	}, []);

	const sortOptions = useMemo(() => {
		return [
			{ id: "sort-name", label: "Name", value: "name" },
			{ id: "sort-property", label: "Property", value: "property" },
			{ id: "sort-rent", label: "Rent", value: "rent" },
			{ id: "sort-status", label: "Payment Status", value: "status" },
		];
	}, []);

	return {
		tenants,
		stats,
		filterOptions,
		sortOptions,
	};
}
