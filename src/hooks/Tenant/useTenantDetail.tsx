"use client";
import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/constants";
import type {
	IPaymentHistoryBlock,
	IRawTenantDetail,
	ITenantActivity,
	ITenantDetail,
	ITenantTransaction,
} from "@/types";

function formatDate(iso: string): string {
	if (!iso) return "";
	return new Date(iso).toLocaleDateString("en-GB");
}

function formatCurrency(amount: number): string {
	if (amount < 0) return `-₦${Math.abs(amount).toLocaleString("en-NG")}`;
	return `₦${amount.toLocaleString("en-NG")}`;
}

function ordinalSuffix(day: number): string {
	if (day >= 11 && day <= 13) return "th";
	switch (day % 10) {
		case 1:
			return "st";
		case 2:
			return "nd";
		case 3:
			return "rd";
		default:
			return "th";
	}
}

export default function useTenantDetailData(tenantId: string | null) {
	const {
		data: rawResponse,
		isLoading,
		mutate,
	} = useSWR<{ data: IRawTenantDetail }>(
		tenantId ? `/api/tenants/${tenantId}` : null,
		fetcher,
		{ revalidateOnMount: true, revalidateOnFocus: true },
	);

	const data = useMemo(() => rawResponse?.data ?? null, [rawResponse]);

	const tenantDetail = useMemo<ITenantDetail | null>(() => {
		if (!data) return null;
		return {
			id: data._id,
			name: data.name,
			avatar: data.avatar ?? "",
			property: data.property,
			unit: data.unit,
			phone: data.phone,
			email: data.email,
			moveInDate: formatDate(data.moveInDate),
			tenancyDuration: data.tenancyDuration ?? "",
			monthlyRent: `₦${data.monthlyRent.toLocaleString("en-NG")}/month`,
			rentDueDay: `${data.rentDueDay}${ordinalSuffix(data.rentDueDay)}`,
			nextDueDate: data.nextDueDate ? formatDate(data.nextDueDate) : "",
			lastPaymentAmount: data.lastPaymentAmount
				? `₦${data.lastPaymentAmount.toLocaleString("en-NG")}`
				: "",
			lastPaymentDate: data.lastPaymentDate
				? formatDate(data.lastPaymentDate)
				: "",
			overdueStatus: data.overdueStatus
				? `Overdue by ${data.overdueDays} day${data.overdueDays !== 1 ? "s" : ""}`
				: "On time",
			overdueDays: data.overdueDays ?? 0,
		};
	}, [data]);

	const transactions = useMemo<ITenantTransaction[]>(() => {
		if (!data?.transactions) return [];
		return data.transactions.map((t) => ({
			id: t._id,
			date: formatDate(t.date),
			type: t.type,
			description: t.description,
			paymentMethod: t.paymentMethod,
			amount: formatCurrency(t.amount),
			amountType: t.amountType,
			runningBalance: formatCurrency(t.runningBalance),
		}));
	}, [data]);

	const paymentHistory = useMemo<IPaymentHistoryBlock[]>(() => {
		if (!data?.paymentHistory) return [];
		return data.paymentHistory.map((h) => ({
			id: h._id,
			month: h.month,
			status: h.status,
		}));
	}, [data]);

	const recentActivity = useMemo<ITenantActivity[]>(() => {
		if (!data?.recentActivity) return [];
		return data.recentActivity.map((a) => ({
			id: a._id,
			label: a.label,
			detail: a.detail,
			date: formatDate(a.date),
			type: a.type,
		}));
	}, [data]);

	const paymentStats = useMemo(() => {
		const ps = data?.paymentStats;
		if (!ps) {
			return {
				reliabilityScore: "0/100",
				reliabilityLabel: "No data",
				avgDelay: "0 days",
				totalPaidThisYear: "₦0",
				outstandingBalance: "₦0",
			};
		}
		const score = ps.reliabilityScore;
		const label =
			score >= 90
				? "Excellent"
				: score >= 75
					? "Good"
					: score >= 60
						? "Fair"
						: "Poor";
		return {
			reliabilityScore: `${score}/100`,
			reliabilityLabel: label,
			avgDelay: `${ps.avgPaymentDelay} day${ps.avgPaymentDelay !== 1 ? "s" : ""}`,
			totalPaidThisYear: formatCurrency(ps.totalPaidThisYear),
			outstandingBalance: formatCurrency(ps.outstandingBalance),
		};
	}, [data]);

	const transactionTotals = useMemo(() => {
		if (!data?.transactions?.length) {
			return {
				totalReceived: "₦0",
				totalExpenses: "₦0",
				netBalance: "₦0",
			};
		}
		const rentTxns = data.transactions.filter(
			(t) => t.type.toLowerCase() === "rent",
		);
		const received = rentTxns
			.filter((t) => t.amountType === "credit")
			.reduce((sum, t) => sum + t.amount, 0);
		const expenses = rentTxns
			.filter((t) => t.amountType === "debit")
			.reduce((sum, t) => sum + t.amount, 0);
		return {
			totalReceived: formatCurrency(received),
			totalExpenses: formatCurrency(expenses),
			netBalance: formatCurrency(received - expenses),
		};
	}, [data]);

	return {
		tenantDetail,
		transactions,
		paymentHistory,
		recentActivity,
		paymentStats,
		transactionTotals,
		isLoading,
		mutate,
	};
}
