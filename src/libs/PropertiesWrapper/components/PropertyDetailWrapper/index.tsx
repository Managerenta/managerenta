"use client";
import { memo } from "react";
import { Box } from "@/components";
import { usePropertyDetail, useTenantNavigation } from "@/hooks";
import { TenantsWrapper } from "@/libs";
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
	const { propertyDetail, units, detailStats, topTenants } =
		usePropertyDetail(propertyId);
	const { isTenantDetailView, selectedTenantId } = useTenantNavigation();

	if (!propertyDetail) return null;

	if (isTenantDetailView && selectedTenantId) {
		return <TenantsWrapper />;
	}

	return (
		<PropertyDetailWrapperStyled>
			<PropertyDetailHeader
				propertyDetail={propertyDetail}
				stats={detailStats}
			/>
			<PropertyOverview propertyDetail={propertyDetail} />

			<Box className="bottom-grid">
				<Box className="left-grid">
					<UnitsGrid
						units={units}
						totalCount={propertyDetail.totalUnits}
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
