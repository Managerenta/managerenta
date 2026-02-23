"use client";
import { memo, useMemo } from "react";
import { Box, Text } from "@/components";
import type { IPropertyDetail } from "@/types";
import { PropertyOverviewStyled } from "./styled";

interface IProps {
	propertyDetail: IPropertyDetail;
}

function PropertyOverview({ propertyDetail }: IProps) {
	const { occupancyRate, monthlyRentTotal, dateAdded } = propertyDetail;

	const percentage = useMemo<number>(() => occupancyRate, [occupancyRate]);

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
				<Text className="action-link">View All Transactions</Text>
				<Text className="action-link">Export Property Report</Text>
			</Box>
		</PropertyOverviewStyled>
	);
}

export default memo(PropertyOverview);
