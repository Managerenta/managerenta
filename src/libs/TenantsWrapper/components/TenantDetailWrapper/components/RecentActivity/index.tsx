"use client";
import { memo, useMemo } from "react";
import { Box, Text } from "@/components";
import type { ITenantActivity } from "@/types";
import { RecentActivityStyled } from "./styled";

interface IProps {
	activities: ITenantActivity[];
}

function getActivityColor(type: string): string {
	switch (type) {
		case "success":
			return "#22c55e";
		case "warning":
			return "#f59e0b";
		case "error":
			return "#ef4444";
		case "info":
			return "#3b82f6";
		default:
			return "#94a3b8";
	}
}

function RecentActivity({ activities }: IProps) {
	const renderedActivities = useMemo(() => {
		return activities.map(({ id, label, detail, date, type }) => (
			<Box key={id} className="activity-item">
				<Box
					className="activity-dot"
					style={{ background: getActivityColor(type) }}
				/>
				<Box className="activity-content">
					<Text className="activity-label">{label}</Text>
					<Text className="activity-detail">
						{date} • {detail}
					</Text>
				</Box>
			</Box>
		));
	}, [activities]);

	return (
		<RecentActivityStyled>
			<Text className="card-title">Recent Activity</Text>
			<Box className="activity-list">{renderedActivities}</Box>
		</RecentActivityStyled>
	);
}

export default memo(RecentActivity);
