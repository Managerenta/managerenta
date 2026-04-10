"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useState } from "react";
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
	const { propertyDetail, units, detailStats, topTenants, mutate } =
		usePropertyDetail(propertyId);
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
			<PropertyOverview propertyDetail={propertyDetail} />

			<Box className="bottom-grid">
				<Box className="left-grid">
					<UnitsGrid
						units={units}
						totalCount={propertyDetail.totalUnits}
						onAddTenant={handleAddTenantToUnit}
					/>
				</Box>
				<Box className="right-grid">
					<PropertySidebar topTenants={topTenants} />
				</Box>
			</Box>
		</PropertyDetailWrapperStyled>
	);
}

export default memo(PropertyDetailWrapper);
