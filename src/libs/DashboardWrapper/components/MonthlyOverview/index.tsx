"use client";
import { memo, useMemo } from "react";
import { Box, Text } from "@/components";
import { useDashboardData } from "@/hooks";
import { MonthlyOverviewStyled } from "./styled";

function MonthlyOverview() {
	const { monthlyOverview } = useDashboardData();
	const { collectedFormatted, expectedFormatted, percentage, dueTodayCount } =
		monthlyOverview;

	const currentMonth = useMemo(() => {
		return new Date().toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
	}, []);

	return (
		<MonthlyOverviewStyled>
			<Text className="section-title">{currentMonth} Overview</Text>

			<Box className="overview-stats">
				<Box className="overview-item">
					<Box className="dot red" />
					<Text className="overview-label">Due Today</Text>
					<Text className="overview-value">{dueTodayCount}</Text>
					<Text className="overview-sublabel">payments</Text>
				</Box>

				<Box className="overview-item">
					<Box className="dot green" />
					<Text className="overview-label">
						Collections This Month
					</Text>
					<Text className="overview-value">{collectedFormatted}</Text>
					<Text className="overview-sublabel">
						{percentage}% of expected
					</Text>
				</Box>

				<Box className="overview-item">
					<Box className="dot yellow" />
					<Text className="overview-label">Expected Total</Text>
					<Text className="overview-value">{expectedFormatted}</Text>
					<Box className="progress-bar-container">
						<Box
							className="progress-bar"
							style={{ width: `${Math.min(percentage, 100)}%` }}
						/>
					</Box>
				</Box>
			</Box>
		</MonthlyOverviewStyled>
	);
}

export default memo(MonthlyOverview);
