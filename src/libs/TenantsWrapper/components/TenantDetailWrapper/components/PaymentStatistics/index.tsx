"use client";
import { memo } from "react";
import { Box, Text } from "@/components";
import { PaymentStatisticsStyled } from "./styled";

interface IProps {
	stats: {
		reliabilityScore: string;
		reliabilityLabel: string;
		avgDelay: string;
		totalPaidThisYear: string;
		outstandingBalance: string;
	};
}

function PaymentStatistics({ stats }: IProps) {
	const {
		reliabilityScore,
		reliabilityLabel,
		avgDelay,
		totalPaidThisYear,
		outstandingBalance,
	} = stats;

	return (
		<PaymentStatisticsStyled>
			<Text className="card-title">Payment Statistics</Text>

			<Box className="stat-row">
				<Text className="stat-label">Payment Reliability Score</Text>
				<Box className="score-row">
					<Text className="score-value">{reliabilityScore}</Text>
					<Box className="score-badge">{reliabilityLabel}</Box>
				</Box>
			</Box>

			<Box className="stat-row">
				<Text className="stat-label">Average Payment Delay</Text>
				<Text className="stat-value">{avgDelay}</Text>
			</Box>

			<Box className="stat-row">
				<Text className="stat-label">Total Paid This Year</Text>
				<Text className="stat-value bold">{totalPaidThisYear}</Text>
			</Box>

			<Box className="stat-row">
				<Text className="stat-label">Outstanding Balance</Text>
				<Text className="stat-value red">{outstandingBalance}</Text>
			</Box>

			<Box className="chart-section">
				<Text className="chart-title">
					Payment Pattern (Last 6 Months)
				</Text>
				{/* TODO: Replace with actual chart component */}
				<Box className="chart-placeholder" />
			</Box>
		</PaymentStatisticsStyled>
	);
}

export default memo(PaymentStatistics);
