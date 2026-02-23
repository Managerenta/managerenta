"use client";
import { memo, useMemo } from "react";
import { Box, Text } from "@/components";
import { MonthlyOverviewStyled } from "./styled";

function MonthlyOverview() {
	const currentMonth = useMemo(() => {
		return new Date().toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
	}, []);

	const collected = 2450000;
	const expected = 2850000;
	const percentage = useMemo(
		() => Math.round((collected / expected) * 100),
		[],
	);

	return (
		<MonthlyOverviewStyled>
			<Text className="section-title">{currentMonth} Overview</Text>

			<Box className="overview-stats">
				<Box className="overview-item">
					<Box className="dot red" />
					<Text className="overview-label">Due Today</Text>
					<Text className="overview-value">7</Text>
					<Text className="overview-sublabel">payments</Text>
				</Box>

				<Box className="overview-item">
					<Box className="dot green" />
					<Text className="overview-label">
						Collections This Month
					</Text>
					<Text className="overview-value">₦2,450,000</Text>
					<Text className="overview-sublabel">86% of expected</Text>
				</Box>

				<Box className="overview-item">
					<Box className="dot yellow" />
					<Text className="overview-label">Expected Total</Text>
					<Text className="overview-value">₦2,850,000</Text>
					<Box className="progress-bar-container">
						<Box
							className="progress-bar"
							style={{ width: `${percentage}%` }}
						/>
					</Box>
				</Box>
			</Box>
		</MonthlyOverviewStyled>
	);
}

export default memo(MonthlyOverview);
