"use client";
import { memo, useMemo } from "react";
import { Box, Button, Text } from "@/components";
import { useDashboardData } from "@/hooks";
import { QuickActionsStyled } from "./styled";

function QuickActions() {
	const { quickActions } = useDashboardData();

	const renderedActions = useMemo(() => {
		return quickActions.map((action, index) => (
			<Box key={index} className="quick-action-item">
				<Box className="action-icon">{action.icon}</Box>
				<Text className="action-label">{action.label}</Text>
				<Button type="button" />
			</Box>
		));
	}, [quickActions]);

	return (
		<QuickActionsStyled>
			<Text className="section-title">Quick Actions</Text>
			<Box className="actions-list">{renderedActions}</Box>
		</QuickActionsStyled>
	);
}

export default memo(QuickActions);
