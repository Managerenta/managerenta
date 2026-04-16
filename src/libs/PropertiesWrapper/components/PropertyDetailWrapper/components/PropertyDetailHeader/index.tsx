"use client";
import Link from "next/link";
import { memo, useCallback, useMemo } from "react";
import { FiEdit2, FiPlus } from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import { usePropertiesNavigation } from "@/hooks";
import type { IPropertyDetail } from "@/types";
import { PropertyDetailHeaderStyled } from "./styled";

interface IProps {
	propertyDetail: IPropertyDetail;
	stats: {
		id: string;
		label: string;
		value: string;
		subtext: string;
		subtextColor: string;
		icon: React.ReactNode;
		iconBg: string;
	}[];
	onEditProperty: () => void;
	onAddUnit: () => void;
}

function PropertyDetailHeader({
	propertyDetail,
	stats,
	onEditProperty,
	onAddUnit,
}: IProps) {
	const { closePropertyDetail } = usePropertiesNavigation();
	const { name, address, type } = propertyDetail;

	const handleBackToProperties = useCallback(() => {
		closePropertyDetail();
	}, [closePropertyDetail]);

	const renderedStats = useMemo(() => {
		return stats.map(
			({ id, label, value, subtext, subtextColor, icon, iconBg }) => (
				<Box key={id} className="stat-card">
					<Box className="stat-top">
						<Text className="stat-label">{label}</Text>
						<Box
							className="stat-icon"
							style={{ background: iconBg }}
						>
							{icon}
						</Box>
					</Box>
					<Text className="stat-value">{value}</Text>
					{subtext && (
						<Text
							className="stat-subtext"
							style={{ color: subtextColor }}
						>
							{subtext}
						</Text>
					)}
				</Box>
			),
		);
	}, [stats]);

	return (
		<PropertyDetailHeaderStyled>
			<Box className="breadcrumb">
				<Link href="/dashboard">Dashboard</Link>
				<span className="separator">&gt;</span>
				<Box
					className="breadcrumb-link"
					onClick={handleBackToProperties}
				>
					<Text>Properties</Text>
				</Box>
				<span className="separator">&gt;</span>
				<Text className="current">{name}</Text>
			</Box>

			<Box className="title-row">
				<Box className="title-section">
					<Text className="property-name">{name}</Text>
					<Text className="property-address">📍 {address}</Text>
					<Box className="type-badge">{type}</Box>
				</Box>

				<Box className="action-buttons">
					<Box className="edit-btn">
						<Button
							type="button"
							title={
								<Box
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
									}}
								>
									<FiEdit2 size={16} />
									<span>Edit Property</span>
								</Box>
							}
							handleClick={onEditProperty}
							background="var(--Surface-Card)"
							color="var(--Black)"
							border="1px solid var(--Border-Subtle)"
							borderRadius="8px"
						/>
					</Box>
					<Box className="add-unit-btn">
						<Button
							type="button"
							title={
								<Box
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
									}}
								>
									<FiPlus size={16} />
									<span>Add New Unit</span>
								</Box>
							}
							handleClick={onAddUnit}
							background="var(--Main-Blue)"
							color="white"
							borderRadius="8px"
						/>
					</Box>
					{/* <Box className="more-btn">
						<Button
							type="button"
							title={<FiMoreHorizontal size={18} />}
							background="white"
							border="1px solid #e2e8f0"
							borderRadius="8px"
						/>
					</Box> */}
				</Box>
			</Box>

			<Box className="stats-grid">{renderedStats}</Box>
		</PropertyDetailHeaderStyled>
	);
}

export default memo(PropertyDetailHeader);
