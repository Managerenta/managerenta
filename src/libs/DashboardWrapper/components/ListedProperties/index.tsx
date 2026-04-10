"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";
import { Box, Button, Image, Text } from "@/components";
import { useDashboardData } from "@/hooks";
import { ListedPropertiesStyled } from "./styled";

function ListedProperties() {
	const { listedProperties } = useDashboardData();
	const router = useRouter();

	const handleViewAll = useCallback(() => {
		router.push("/properties");
	}, [router]);

	const handleViewDetails = useCallback(
		(propertyId: string) => {
			router.push(`/properties/${propertyId}`);
		},
		[router],
	);

	const renderedProperties = useMemo(() => {
		return listedProperties.map(
			({
				id,
				name,
				location,
				totalUnits,
				occupied,
				monthlyRevenue,
				image,
			}) => {
				const occupancyPercent =
					totalUnits > 0
						? Math.round((occupied / totalUnits) * 100)
						: 0;
				return (
					<Box key={id} className="property-card">
						<Box className="property-image">
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
						<Box className="property-details">
							<Text className="property-name">{name}</Text>
							<Text className="property-location">
								{location}
							</Text>
							<Box className="occupancy-row">
								<Text className="occupancy-text">
									{totalUnits} units • {occupied} occupied
								</Text>
								<Text className="occupancy-percent">
									{occupancyPercent}% occupied
								</Text>
							</Box>
							<Box className="occupancy-bar">
								<Box
									className="occupancy-fill"
									style={{ width: `${occupancyPercent}%` }}
								/>
							</Box>
							<Box className="revenue-row">
								<Text className="revenue">
									{monthlyRevenue}
								</Text>
								<Box className="view-details">
									<Button
										type="button"
										background="inherit"
										title="View Details"
										handleClick={() =>
											handleViewDetails(id)
										}
									/>
								</Box>
							</Box>
						</Box>
					</Box>
				);
			},
		);
	}, [listedProperties, handleViewDetails]);

	return (
		<ListedPropertiesStyled>
			<Box className="section-header">
				<Text className="section-title">Your Properties</Text>
				<Box className="view-all">
					<Button
						type="button"
						background="inherit"
						title="View All"
						handleClick={handleViewAll}
					/>
				</Box>
			</Box>
			<Box className="properties-grid">{renderedProperties}</Box>
		</ListedPropertiesStyled>
	);
}

export default memo(ListedProperties);
