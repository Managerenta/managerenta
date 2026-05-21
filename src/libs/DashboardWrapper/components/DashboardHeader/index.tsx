"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";
import { FiPlus } from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import { useDashboardData } from "@/hooks";
import { DashboardHeaderStyled } from "./styled";

function DashboardHeader() {
	const { stats } = useDashboardData();
	const router = useRouter();

	const handleAddProperty = useCallback(() => {
		router.push("/properties/new");
	}, [router]);

	const formattedDate = useMemo(() => {
		return new Date().toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	}, []);

	const renderedStats = useMemo(() => {
		return stats.map((stat, index) => (
			<Box key={index} className="stat-card">
				<Box className="stat-top">
					<Text className="stat-label">{stat.label}</Text>
					<Box
						className="stat-icon"
						style={{ background: stat.iconBg }}
					>
						{stat.icon}
					</Box>
				</Box>
				<Text className="stat-value">{stat.value}</Text>
				<Text
					className="stat-subtext"
					style={{ color: stat.subtextColor }}
				>
					{stat.subtext}
				</Text>
			</Box>
		));
	}, [stats]);

	return (
		<DashboardHeaderStyled>
			<Box className="top-row">
				<Box className="title-section">
					<Text className="title">Dashboard</Text>
					<Text className="date">{formattedDate}</Text>
				</Box>

				<Box className="add-btn">
					<Button
						type="button"
						background="inherit"
						handleClick={handleAddProperty}
						title={
							<Box
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
							>
								<FiPlus size={20} />
								<span>Add Property</span>
							</Box>
						}
					/>
				</Box>
			</Box>

			<Box className="stats-grid">{renderedStats}</Box>
		</DashboardHeaderStyled>
	);
}

export default memo(DashboardHeader);
