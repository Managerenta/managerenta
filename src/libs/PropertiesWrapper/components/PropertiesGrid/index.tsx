"use client";
import { memo, useCallback, useMemo } from "react";
import { Box, Button, Image, Text } from "@/components";
import { usePropertiesNavigation } from "@/hooks";
import type { IPropertyList } from "@/types";
import { PropertiesGridStyled } from "./styled";

interface IProps {
	properties: IPropertyList[];
	isLoading: boolean;
	viewMode: "grid" | "list";
}

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

function getTypeBadgeColors(type: string): { bg: string; text: string } {
	const map: Record<string, { bg: string; text: string }> = {
		Apartment: { bg: "#dbeafe", text: "#2563eb" },
		Duplex: { bg: "#fce7f3", text: "#db2777" },
		Studio: { bg: "#fce7f3", text: "#db2777" },
		Commercial: { bg: "#d1fae5", text: "#059669" },
		House: { bg: "#ede9fe", text: "#7c3aed" },
		Bungalow: { bg: "#fef3c7", text: "#d97706" },
		Land: { bg: "#fef3c7", text: "#d97706" },
		"High-rise": { bg: "#e0f2fe", text: "#0284c7" },
	};
	return map[type] ?? { bg: "#f1f5f9", text: "#64748b" };
}

function PropertiesGrid({ properties, isLoading, viewMode }: IProps) {
	const { openPropertyDetail } = usePropertiesNavigation();

	const handleViewDetails = useCallback(
		(propertyId: string) => {
			openPropertyDetail(propertyId);
		},
		[openPropertyDetail],
	);

	const renderedProperties = useMemo(() => {
		if (isLoading) {
			return Array.from({ length: 6 }, (_, i) => (
				<Box key={i} className="property-card skeleton" />
			));
		}

		if (properties.length === 0) {
			return (
				<Box
					className="empty-state"
					style={{
						color: "var(--Secondary-700)",
						fontWeight: "600",
					}}
				>
					<Text>
						No properties found. Add your first property to get
						started.
					</Text>
				</Box>
			);
		}

		return properties.map(
			({
				id,
				name,
				address,
				type,
				totalUnits,
				occupied,
				vacant,
				monthlyRevenue,
				occupancyStatus,
				image,
			}) => {
				const occupancyPercent =
					totalUnits > 0
						? Math.round((occupied / totalUnits) * 100)
						: 0;
				const statusColors = getStatusColor(occupancyStatus);
				const typeColors = getTypeBadgeColors(type);

				return (
					<Box key={id} className="property-card">
						<Box className="card-image">
							{image ? (
								<Image
									url={image}
									alt={name}
									width="100%"
									height="100%"
									style={{ objectFit: "cover" }}
								/>
							) : (
								<Box className="image-placeholder" />
							)}
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
	}, [properties, isLoading, handleViewDetails]);

	return (
		<PropertiesGridStyled $viewMode={viewMode}>
			<Box className={`grid ${viewMode === "list" ? "list" : ""}`}>
				{renderedProperties}
			</Box>
		</PropertiesGridStyled>
	);
}

export default memo(PropertiesGrid);
