"use client";
import { memo, useMemo } from "react";
import { FiPlus } from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import { usePropertiesData } from "@/hooks";
import { PropertiesHeaderStyled } from "./styled";

function PropertiesHeader() {
	const { stats } = usePropertiesData();

	const renderedStats = useMemo(() => {
		return stats.map(
			({
				id,
				label,
				value,
				subtext,
				subtextColor,
				icon,
				iconBg,
				progressBar,
			}) => (
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
					{progressBar && (
						<Box className="stat-progress">
							<Box
								className="stat-progress-fill"
								style={{
									width: `${progressBar.value}%`,
									background: progressBar.color,
								}}
							/>
						</Box>
					)}
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
		<PropertiesHeaderStyled>
			<Box className="top-row">
				<Text className="title">My Properties</Text>
				<Box className="add-btn">
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
								<FiPlus size={18} />
								<span>Add New Property</span>
							</Box>
						}
					/>
				</Box>
			</Box>
			<Box className="stats-grid">{renderedStats}</Box>
		</PropertiesHeaderStyled>
	);
}

export default memo(PropertiesHeader);
