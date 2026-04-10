"use client";
import { memo, useMemo } from "react";
import { FiPlus } from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import type { IPropertyStatItem } from "@/types";
import { PropertiesHeaderStyled } from "./styled";

interface IProps {
	stats: IPropertyStatItem[];
	isLoading: boolean;
	onAddProperty: () => void;
}

function PropertiesHeader({ stats, isLoading, onAddProperty }: IProps) {
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
					<Text className="stat-value">
						{isLoading ? "—" : value}
					</Text>
					{progressBar && (
						<Box className="stat-progress">
							<Box
								className="stat-progress-fill"
								style={{
									width: isLoading
										? "0%"
										: `${progressBar.value}%`,
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
	}, [stats, isLoading]);

	return (
		<PropertiesHeaderStyled>
			<Box className="top-row">
				<Text className="title">My Properties</Text>
				<Box className="add-btn">
					<Button
						type="button"
						background="inherit"
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
						handleClick={onAddProperty}
					/>
				</Box>
			</Box>
			<Box className="stats-grid">{renderedStats}</Box>
		</PropertiesHeaderStyled>
	);
}

export default memo(PropertiesHeader);
