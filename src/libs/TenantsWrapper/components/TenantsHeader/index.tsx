"use client";
import { memo, useMemo } from "react";
import { FiPlus } from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import { useTenants } from "@/hooks";
import { TenantsHeaderStyled } from "./styled";

function TenantsHeader() {
	const { stats } = useTenants();

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
