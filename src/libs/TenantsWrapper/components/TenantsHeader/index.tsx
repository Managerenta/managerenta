"use client";
import { memo, useMemo } from "react";
import { FiPlus } from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import type { ITenantStatItem } from "@/types";
import { TenantsHeaderStyled } from "./styled";

interface IProps {
	stats: ITenantStatItem[];
	isLoading: boolean;
	onAddTenant: () => void;
}

function TenantsHeader({ stats, onAddTenant }: IProps) {
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
		<TenantsHeaderStyled>
			<Box className="top-row">
				<Text className="title">My Tenants</Text>
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
								<span>Add New Tenant</span>
							</Box>
						}
						handleClick={onAddTenant}
						background="var(--Main-Blue)"
						color="white"
						borderRadius="8px"
					/>
				</Box>
			</Box>
			<Box className="stats-grid">{renderedStats}</Box>
		</TenantsHeaderStyled>
	);
}

export default memo(TenantsHeader);
