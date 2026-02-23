"use client";
import { memo, useMemo } from "react";
import { Box, Button, Text } from "@/components";
import { useDashboardData } from "@/hooks";
import { UrgentActionsStyled } from "./styled";

function UrgentActions() {
	const { dueToday, overdue } = useDashboardData();

	const renderedDueToday = useMemo(() => {
		return dueToday.map((item, index) => (
			<Box key={index} className="action-row">
				<Box className="avatar-placeholder" />
				<Box className="tenant-info">
					<Text className="tenant-name">{item.name}</Text>
					<Text className="tenant-property">{item.property}</Text>
				</Box>
				<Text className="amount">{item.amount}</Text>
				<Box className="action-buttons">
					<Button
						type="button"
						title="Contact"
						borderRadius="inherit"
						background="#16a34a"
						color="white"
					/>
					<Button
						type="button"
						title="Record Payment"
						borderRadius="inherit"
						background="var(--Main-Blue)"
						color="white"
					/>
				</Box>
			</Box>
		));
	}, [dueToday]);

	const renderedOverdue = useMemo(() => {
		return overdue.map((item, index) => (
			<Box key={index} className="action-row overdue-row">
				<Box className="avatar-placeholder" />
				<Box className="tenant-info">
					<Text className="tenant-name">{item.name}</Text>
					<Text className="tenant-property">{item.property}</Text>
				</Box>
				<Text className="overdue-badge">
					{item.overdueDays} days overdue
				</Text>
				<Text className="amount">{item.amount}</Text>
				<Box className="action-buttons">
					<Button
						type="button"
						title="Contact"
						borderRadius="inherit"
						background="#16a34a"
						color="white"
					/>
					<Button
						type="button"
						title="Record Payment"
						borderRadius="inherit"
						background="var(--Main-Blue)"
						color="white"
					/>
				</Box>
			</Box>
		));
	}, [overdue]);

	return (
		<UrgentActionsStyled>
			<Box className="section-header">
				<Text className="section-title">Urgent Actions</Text>
				<Box className="badge-count">7</Box>
			</Box>

			<Box className="subsection">
				<Text className="subsection-title">Due Today</Text>
				<Box className="action-list">{renderedDueToday}</Box>
			</Box>

			<Box className="subsection">
				<Text className="subsection-title">Overdue Payments</Text>
				<Box className="action-list">{renderedOverdue}</Box>
			</Box>
		</UrgentActionsStyled>
	);
}

export default memo(UrgentActions);
