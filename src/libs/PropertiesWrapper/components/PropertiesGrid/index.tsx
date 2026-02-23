"use client";
import { memo, useCallback, useMemo } from "react";
// import { Image } from "@/components";
import { Box, Button, Text } from "@/components";
import { usePropertiesData, usePropertiesNavigation } from "@/hooks";
import { PropertiesGridStyled } from "./styled";

function getStatusColor(status: string): { bg: string; text: string } {
	switch (status) {
		case "Excellent":
			return { bg: "#dcfce7", text: "#16a34a" };
		case "Good":
			return { bg: "#fef9c3", text: "#ca8a04" };
		case "Needs Attention":
			return { bg: "#fee2e2", text: "#ef4444" };
		default:
			return { bg: "#f1f5f9", text: "#64748b" };
	}
}

function getTypeBadgeColor(type: string): { bg: string; text: string } {
	switch (type) {
		case "Apartment Building":
			return { bg: "#dbeafe", text: "#2563eb" };
		case "Duplex":
			return { bg: "#fce7f3", text: "#db2777" };
		case "Office Building":
			return { bg: "#d1fae5", text: "#059669" };
		case "Residential Estate":
			return { bg: "#ede9fe", text: "#7c3aed" };
		case "Bungalow":
			return { bg: "#fef3c7", text: "#d97706" };
		case "High-rise":
			return { bg: "#e0f2fe", text: "#0284c7" };
		default:
			return { bg: "#f1f5f9", text: "#64748b" };
	}
}

function PropertiesGrid() {
	const { properties } = usePropertiesData();
	const { openPropertyDetail } = usePropertiesNavigation();

	const handleViewDetails = useCallback(
		(propertyId: string) => {
			openPropertyDetail(propertyId);
		},
		[openPropertyDetail],
	);

	const renderedProperties = useMemo(() => {
		return properties.map(
			({
				id,
				name,
				address,
				type,
				// image,
				totalUnits,
				occupied,
				vacant,
				monthlyRevenue,
				occupancyStatus,
			}) => {
				const occupancyPercent = Math.round(
					(occupied / totalUnits) * 100,
				);
				const statusColors = getStatusColor(occupancyStatus);
				const typeColors = getTypeBadgeColor(type);

				return (
					<Box key={id} className="property-card">
						<Box className="card-image">
							{/* TODO: Replace placeholder with Image when ready */}
							{/* <Image
								alt={name}
								url={image}
								width="100%"
								height="180px"
								aspectRatio={16 / 9}
							/> */}
							<Box className="image-placeholder" />
						</Box>

						<Box className="card-body">
							<Text className="card-name">{name}</Text>
							<Text className="card-address">{address}</Text>

							<Box
								className="type-badge"
								style={{
									background: typeColors.bg,
									color: typeColors.text,
								}}
							>
								{type}
							</Box>

							<Box className="units-row">
								<Text className="units-text">
									{totalUnits} units •{" "}
									<span className="occupied">
										{occupied} occupied
									</span>{" "}
									•{" "}
									<span className="vacant">
										{vacant} vacant
									</span>
								</Text>
							</Box>

							<Box className="occupancy-section">
								<Box className="occupancy-label-row">
									<Text className="occupancy-label">
										Occupancy
									</Text>
									<Text className="occupancy-value">
										{occupancyPercent}%
									</Text>
								</Box>
								<Box className="occupancy-bar">
									<Box
										className="occupancy-fill"
										style={{
											width: `${occupancyPercent}%`,
											background:
												occupancyPercent >= 90
													? "#22c55e"
													: occupancyPercent >= 70
														? "#0ea5e9"
														: "#ef4444",
										}}
									/>
								</Box>
							</Box>

							<Box
								className="status-badge"
								style={{
									background: statusColors.bg,
									color: statusColors.text,
								}}
							>
								{occupancyStatus}
							</Box>

							<Text className="card-revenue">
								{monthlyRevenue}
							</Text>

							<Box className="card-footer">
								<Button
									type="button"
									title="View Details"
									handleClick={() => handleViewDetails(id)}
								/>
							</Box>
						</Box>
					</Box>
				);
			},
		);
	}, [properties, handleViewDetails]);

	return (
		<PropertiesGridStyled>
			<Box className="grid">{renderedProperties}</Box>
		</PropertiesGridStyled>
	);
}

export default memo(PropertiesGrid);
