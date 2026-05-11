"use client";
import { useMemo } from "react";
import { FiAlertCircle, FiHome, FiLayers, FiUsers } from "react-icons/fi";
import useSWR from "swr";
import { fetcher } from "@/constants";
import type { IPropertyDetail, IPropertyUnit, ITopTenant } from "@/types";

interface IRawUnit {
	_id: string;
	name: string;
	status: "Occupied" | "Vacant";
	tenant?: { _id: string; name: string; avatar?: string };
	rent: number;
	dueDate?: string;
	paymentStatus?: "Paid" | "Due Soon" | "Overdue";
	vacantDays?: number;
}

interface IRawPropertyDetail {
	_id: string;
	name: string;
	address: string;
	type: string;
	totalUnits: number;
	occupied: number;
	monthlyRent: number;
	image?: string;
	createdAt: string;
	units?: IRawUnit[];
	averageVacancyDays?: number;
	rentCollectedThisYear?: number;
	topPayingTenants?: {
		_id: string;
		name: string;
		avatar?: string;
		monthlyRent: number;
		unit: string;
	}[];
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-GB");
}

export default function usePropertyDetail(propertyId: string | null) {
	const {
		data: rawResponse,
		isLoading,
		mutate,
	} = useSWR<{
		data: IRawPropertyDetail;
	}>(propertyId ? `/api/properties/${propertyId}` : null, fetcher, {
		revalidateOnMount: true,
	});
	const data = useMemo(() => rawResponse?.data ?? null, [rawResponse]);

	const propertyDetail = useMemo<IPropertyDetail | null>(() => {
		if (!data) return null;
		const occupied =
			data.units && data.units.length > 0
				? data.units.filter((u) => u.status === "Occupied").length
				: (data.occupied ?? 0);
		const vacant = data.totalUnits - occupied;
		const occupancyRate =
			data.totalUnits > 0
				? Math.round((occupied / data.totalUnits) * 100)
				: 0;
		const unitRentTotal =
			data.units && data.units.length > 0
				? data.units.reduce((sum, u) => sum + u.rent, 0)
				: data.monthlyRent * data.totalUnits;

		return {
			id: data._id,
			name: data.name,
			address: data.address,
			type: data.type,
			dateAdded: formatDate(data.createdAt),
			monthlyRent: data.monthlyRent,
			monthlyRentTotal: `₦${unitRentTotal.toLocaleString("en-NG")}`,
			totalUnits: data.totalUnits,
			occupied,
			vacant,
			occupancyRate,
			units: [],
		};
	}, [data]);

	const units = useMemo<IPropertyUnit[]>(() => {
		if (!data?.units) return [];
		return data.units.map((u) => ({
			id: u._id,
			name: u.name,
			status: u.status,
			tenantId: u.tenant?._id,
			tenantName: u.tenant?.name,
			tenantAvatar: u.tenant?.avatar,
			rent: `₦${u.rent.toLocaleString("en-NG")}/month`,
			rentAmount: u.rent,
			dueDate: u.dueDate
				? `Due: ${new Date(u.dueDate).toLocaleDateString("en-GB")}`
				: undefined,
			paymentStatus: u.paymentStatus,
			vacantDays: u.vacantDays,
		}));
	}, [data]);

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
				iconBg: "#9cc1f1",
			},
			{
				id: "stat-002",
				label: "Occupied Units",
				value: String(propertyDetail.occupied),
				subtext: `${propertyDetail.occupancyRate}% occupied`,
				subtextColor: "#16a34a",
				icon: <FiUsers size={18} />,
				iconBg: "#a5f2ca",
			},
			{
				id: "stat-003",
				label: "Vacant Units",
				value: String(propertyDetail.vacant),
				subtext: `${100 - propertyDetail.occupancyRate}% vacant`,
				subtextColor: "#ef4444",
				icon: <FiAlertCircle size={18} />,
				iconBg: "#f19696",
			},
			{
				id: "stat-004",
				label: "Monthly Rent Total",
				value: propertyDetail.monthlyRentTotal,
				subtext: "",
				subtextColor: "#64748b",
				icon: <FiLayers size={18} />,
				iconBg: "#91eebe",
			},
		];
	}, [propertyDetail]);

	const topTenants = useMemo<ITopTenant[]>(() => {
		if (!data?.topPayingTenants) return [];
		return data.topPayingTenants.map((t) => ({
			id: t._id,
			name: t.name,
			unit: t.unit,
			monthlyRent: `₦${t.monthlyRent.toLocaleString("en-NG")}/mo`,
			avatar: t.avatar,
		}));
	}, [data]);

	const averageVacancyDays = useMemo<string>(() => {
		if (!data?.averageVacancyDays && data?.averageVacancyDays !== 0)
			return "—";
		const days = data.averageVacancyDays;
		return days === 0
			? "No data yet"
			: `${days} day${days !== 1 ? "s" : ""}`;
	}, [data]);

	const rentCollectedThisYear = useMemo<string>(() => {
		if (!data?.rentCollectedThisYear && data?.rentCollectedThisYear !== 0)
			return "—";
		return `₦${data.rentCollectedThisYear.toLocaleString("en-NG")}`;
	}, [data]);

	return {
		propertyDetail,
		units,
		detailStats,
		topTenants,
		averageVacancyDays,
		rentCollectedThisYear,
		isLoading,
		mutate,
	};
}
