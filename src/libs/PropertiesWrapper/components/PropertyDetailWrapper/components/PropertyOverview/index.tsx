"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";
import { Box, Text } from "@/components";
import { useToast } from "@/hooks";
import type { IPropertyDetail } from "@/types";
import { PropertyOverviewStyled } from "./styled";

interface IProps {
	propertyDetail: IPropertyDetail;
	onExport: () => void;
}

function PropertyOverview({ propertyDetail, onExport }: IProps) {
	const toast = useToast();
	const router = useRouter();
	const { occupancyRate, monthlyRentTotal, dateAdded } = propertyDetail;
	const percentage = useMemo<number>(() => occupancyRate, [occupancyRate]);

	const handleViewTransactions = useCallback(() => {
		router.push("/tenants");
		toast.push(`Showing tenants in ${propertyDetail.name}`);
	}, [router, propertyDetail.name, toast]);

	return (
		<PropertyOverviewStyled>
			<Box className="info-section">
				<Text className="section-title">Property Information</Text>
				<Box className="info-row">
					<Text className="info-label">Date added:</Text>
					<Text className="info-value">{dateAdded}</Text>
				</Box>
				<Box className="info-row">
					<Text className="info-label">Monthly rent total:</Text>
					<Text className="info-value bold">{monthlyRentTotal}</Text>
				</Box>
			</Box>

			<Box className="occupancy-section">
				<Text className="section-title">Occupancy Rate</Text>
				<Text className="occupancy-value">{percentage}%</Text>
				<Box className="progress-bar-container">
					<Box
						className="progress-bar"
						style={{ width: `${percentage}%` }}
					/>
				</Box>
			</Box>

			<Box className="quick-actions-section">
				<Text className="section-title">Quick Actions</Text>
				<Text className="action-link" onClick={handleViewTransactions}>
					View All Transactions
				</Text>
				<Text className="action-link" onClick={onExport}>
					Export Property Report
				</Text>
			</Box>
		</PropertyOverviewStyled>
	);
}

export default memo(PropertyOverview);
