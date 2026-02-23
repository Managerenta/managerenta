"use client";
import { memo } from "react";
import { Box } from "@/components";
import {
	DashboardHeader,
	ListedProperties,
	MonthlyOverview,
	QuickActions,
	RecentTransactions,
	UrgentActions,
} from "./components";
import { DashboardWrapperStyled } from "./styled";

function DashboardWrapper() {
	return (
		<DashboardWrapperStyled>
			<DashboardHeader />
			<MonthlyOverview />

			<Box className="bottom-grid">
				<Box className="left-grid">
					<UrgentActions />
					<ListedProperties />
				</Box>
				<Box className="right-grid">
					<RecentTransactions />
					<QuickActions />
				</Box>
			</Box>
		</DashboardWrapperStyled>
	);
}

export default memo(DashboardWrapper);
