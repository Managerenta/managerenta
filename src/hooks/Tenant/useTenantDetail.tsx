"use client";
import { useMemo } from "react";
import type {
	IPaymentHistoryBlock,
	ITenantActivity,
	ITenantDetail,
	ITenantTransaction,
} from "@/types";

export default function useTenantDetailData(tenantId: string | null) {
	const tenantDetail = useMemo<ITenantDetail | null>(() => {
		if (!tenantId) return null;

		// TODO: Replace with API call using tenantId
		return {
			id: "tenant-001",
			name: "Chioma Okoro",
			avatar: "/images/tenants/chioma.webp",
			property: "Sunset Apartments",
			unit: "Block A, Flat 2",
			phone: "+234 803 123 4567",
			email: "chioma.okoro@email.com",
			moveInDate: "15/01/2022",
			tenancyDuration: "2 years 11 months",
			monthlyRent: "₦450,000",
			rentDueDay: "15th",
			nextDueDate: "15/01/2025",
			lastPaymentAmount: "₦450,000",
			lastPaymentDate: "10/11/2024",
			overdueStatus: "Overdue by 5 days",
			overdueDays: 5,
		};
	}, [tenantId]);

	const transactions = useMemo<ITenantTransaction[]>(() => {
		if (!tenantId) return [];

		return [
			{
				id: "txn-001",
				date: "10/11/2024",
				type: "Rent",
				description: "Monthly rent payment",
				paymentMethod: "Bank Transfer",
				amount: "₦450,000",
				amountType: "credit",
				runningBalance: "₦0",
			},
			{
				id: "txn-002",
				date: "15/10/2024",
				type: "Rent",
				description: "Monthly rent payment",
				paymentMethod: "Bank Transfer",
				amount: "₦450,000",
				amountType: "credit",
				runningBalance: "₦0",
			},
			{
				id: "txn-003",
				date: "20/09/2024",
				type: "Maintenance",
				description: "AC repair service",
				paymentMethod: "Cash",
				amount: "₦25,000",
				amountType: "debit",
				runningBalance: "₦425,000",
			},
			{
				id: "txn-004",
				date: "15/09/2024",
				type: "Rent",
				description: "Monthly rent payment (Late)",
				paymentMethod: "Bank Transfer",
				amount: "₦450,000",
				amountType: "credit",
				runningBalance: "₦450,000",
			},
		];
	}, [tenantId]);

	const paymentHistory = useMemo<IPaymentHistoryBlock[]>(() => {
		return [
			{ id: "ph-001", status: "paid" },
			{ id: "ph-002", status: "paid" },
			{ id: "ph-003", status: "late" },
			{ id: "ph-004", status: "paid" },
			{ id: "ph-005", status: "paid" },
			{ id: "ph-006", status: "paid" },
			{ id: "ph-007", status: "paid" },
			{ id: "ph-008", status: "paid" },
			{ id: "ph-009", status: "late" },
			{ id: "ph-010", status: "overdue" },
			{ id: "ph-011", status: "overdue" },
		];
	}, []);

	const recentActivity = useMemo<ITenantActivity[]>(() => {
		return [
			{
				id: "act-001",
				label: "Payment received",
				detail: "₦450,000",
				date: "10/11/2024",
				type: "success",
			},
			{
				id: "act-002",
				label: "Payment reminder sent",
				detail: "Email & SMS",
				date: "08/11/2024",
				type: "warning",
			},
			{
				id: "act-003",
				label: "Maintenance expense",
				detail: "₦25,000 AC repair",
				date: "20/09/2024",
				type: "error",
			},
			{
				id: "act-004",
				label: "Late payment received",
				detail: "₦450,000 (3 days late)",
				date: "15/09/2024",
				type: "warning",
			},
			{
				id: "act-005",
				label: "Tenant contact updated",
				detail: "Phone number changed",
				date: "05/09/2024",
				type: "info",
			},
		];
	}, []);

	const paymentStats = useMemo(() => {
		return {
			reliabilityScore: "7.2/10",
			reliabilityLabel: "Fair",
			avgDelay: "3.2 days",
			totalPaidThisYear: "₦5,400,000",
			outstandingBalance: "₦450,000",
		};
	}, []);

	const transactionTotals = useMemo(() => {
		return {
			totalReceived: "₦1,350,000",
			totalExpenses: "₦25,000",
			netBalance: "₦1,325,000",
		};
	}, []);

	return {
		tenantDetail,
		transactions,
		paymentHistory,
		recentActivity,
		paymentStats,
		transactionTotals,
	};
}
