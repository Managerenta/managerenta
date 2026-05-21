"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Box } from "@/components";
import { usePropertyDetail } from "@/hooks";
import type { TenantModalMode } from "@/layouts";
import { PropertyModal, TenantModal } from "@/layouts";
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
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
	const [tenantModalMode, setTenantModalMode] =
		useState<TenantModalMode | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const openEditModal = useCallback(() => setIsEditModalOpen(true), []);
	const closeEditModal = useCallback(() => setIsEditModalOpen(false), []);
	const openAddUnitModal = useCallback(() => setIsAddUnitModalOpen(true), []);
	const closeAddUnitModal = useCallback(
		() => setIsAddUnitModalOpen(false),
		[],
	);
	const closeTenantModal = useCallback(() => setTenantModalMode(null), []);

	const handleAddTenantToUnit = useCallback(
		(unit: IPropertyUnit) => {
			if (!propertyDetail) return;
			setTenantModalMode({
				type: "add-tenant",
				preselectedUnit: {
					id: unit.id,
					name: unit.name,
					rent: unit.rentAmount,
					propertyName: propertyDetail.name,
				},
			});
		},
		[propertyDetail],
	);

	const handlePropertyUpdated = useCallback(async () => {
		await mutate();
		router.refresh();
	}, [mutate, router]);

	const handleUnitAdded = useCallback(async () => {
		await mutate();
	}, [mutate]);

	const handleExportReport = useCallback(() => {
		if (!propertyDetail) return;
		if (units.length === 0) {
			toast.info("No units to export");
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
		toast.success("Report downloaded");
	}, [propertyDetail, units]);

	if (!propertyDetail) return null;

	return (
		<PropertyDetailWrapperStyled>
			<PropertyDetailHeader
				propertyDetail={propertyDetail}
				stats={detailStats}
				onEditProperty={openEditModal}
				onAddUnit={openAddUnitModal}
			/>
			{mounted && (
				<>
					<PropertyModal
						open={isEditModalOpen}
						close={closeEditModal}
						mode={{
							type: "edit-property",
							property: propertyDetail,
						}}
						onSuccess={handlePropertyUpdated}
					/>
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
					{tenantModalMode && (
						<TenantModal
							open={!!tenantModalMode}
							close={closeTenantModal}
							mode={tenantModalMode}
							onSuccess={mutate}
						/>
					)}
				</>
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
