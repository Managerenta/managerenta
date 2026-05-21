"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useState } from "react";
import { Box } from "@/components";
import { usePropertyDetail, useToast } from "@/hooks";
import { PropertyModal } from "@/layouts";
import type { IPropertyUnit } from "@/types";
import {
	PropertyDetailHeader,
	PropertyOverview,
	PropertySidebar,
	UnitsGrid,
} from "./components";
import { PropertyDetailWrapperStyled } from "./styled";

interface IProps {
	propertyId: string;
}

function PropertyDetailWrapper({ propertyId }: IProps) {
	const toast = useToast();
	const router = useRouter();
	const {
		propertyDetail,
		units,
		detailStats,
		topTenants,
		averageVacancyDays,
		rentCollectedThisYear,
		mutate,
	} = usePropertyDetail(propertyId);
	const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const handleEditProperty = useCallback(() => {
		router.push(`/properties/${propertyId}/edit`);
	}, [router, propertyId]);
	const openAddUnitModal = useCallback(() => setIsAddUnitModalOpen(true), []);
	const closeAddUnitModal = useCallback(
		() => setIsAddUnitModalOpen(false),
		[],
	);

	const handleAddTenantToUnit = useCallback(
		(unit: IPropertyUnit) => {
			if (!propertyDetail) return;
			const params = new URLSearchParams({
				unitId: unit.id,
				unitName: unit.name,
				rent: String(unit.rentAmount),
				propertyName: propertyDetail.name,
			});
			router.push(`/tenants/new?${params.toString()}`);
		},
		[propertyDetail, router],
	);

	const handleUnitAdded = useCallback(async () => {
		await mutate();
	}, [mutate]);

	const handleExportReport = useCallback(() => {
		if (!propertyDetail) return;
		if (units.length === 0) {
			toast.push("No units to export");
			return;
		}
		const escapeCell = (cell: string) => {
			const needs = /[",\n]/.test(cell);
			const out = cell.replace(/"/g, '""');
			return needs ? `"${out}"` : out;
		};
		const header = [
			"Unit",
			"Status",
			"Tenant",
			"Monthly Rent",
			"Payment Status",
			"Due Date",
			"Vacant Days",
		];
		const body = units.map((u) => [
			u.name,
			u.status,
			u.tenantName ?? "",
			u.rent,
			u.paymentStatus ?? "",
			u.dueDate ?? "",
			u.vacantDays !== undefined ? String(u.vacantDays) : "",
		]);
		const csv = [header, ...body]
			.map((r) => r.map(escapeCell).join(","))
			.join("\n");
		const blob = new Blob([`﻿${csv}`], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		const safe = propertyDetail.name
			.replace(/[^a-z0-9]+/gi, "-")
			.toLowerCase();
		a.download = `${safe || "property"}-report.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		toast.push("Report downloaded", { type: "success" });
	}, [propertyDetail, units, toast]);

	if (!propertyDetail) return null;

	return (
		<PropertyDetailWrapperStyled>
			<PropertyDetailHeader
				propertyDetail={propertyDetail}
				stats={detailStats}
				onEditProperty={handleEditProperty}
				onAddUnit={openAddUnitModal}
			/>
			{mounted && (
				<PropertyModal
					open={isAddUnitModalOpen}
					close={closeAddUnitModal}
					mode={{
						type: "add-unit",
						propertyId: propertyDetail.id,
						existingUnitCount: units.length,
					}}
					onSuccess={handleUnitAdded}
				/>
			)}
			<PropertyOverview
				propertyDetail={propertyDetail}
				onExport={handleExportReport}
			/>

			<Box className="bottom-grid">
				<Box className="left-grid">
					<UnitsGrid
						units={units}
						totalCount={propertyDetail.totalUnits}
						onAddTenant={handleAddTenantToUnit}
					/>
				</Box>
				<Box className="right-grid">
					<PropertySidebar
						propertyName={propertyDetail.name}
						units={units}
						topTenants={topTenants}
						averageVacancyDays={averageVacancyDays}
						rentCollectedThisYear={rentCollectedThisYear}
						onAddUnit={openAddUnitModal}
					/>
				</Box>
			</Box>
		</PropertyDetailWrapperStyled>
	);
}

export default memo(PropertyDetailWrapper);
