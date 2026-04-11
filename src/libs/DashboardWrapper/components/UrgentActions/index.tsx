"use client";
import { memo, useCallback, useMemo } from "react";
import { Box, Button, Image, Text } from "@/components";
import {
	useAddTransactionNavigation,
	useDashboardData,
	useTenantNavigation,
} from "@/hooks";
import type { ITenantAction } from "@/types";
import { UrgentActionsStyled } from "./styled";

function UrgentActions() {
	const { dueToday, overdue, urgentActionCount } = useDashboardData();
	const { openTenantDetail } = useTenantNavigation();
	const { openAddTransaction } = useAddTransactionNavigation();

	const handleContact = useCallback(
		(item: ITenantAction) => {
			if (item.phone) {
				window.location.href = `tel:${item.phone}`;
				return;
			}
			openTenantDetail(item.tenantId);
		},
		[openTenantDetail],
	);

	const handleRecordPayment = useCallback(
		(tenantId: string) => {
			openAddTransaction(tenantId);
		},
		[openAddTransaction],
	);

	const renderRow = useCallback(
		(item: ITenantAction, isOverdue: boolean) => (
			<Box
				key={item.id}
				className={`action-row ${isOverdue ? "overdue-row" : ""}`}
			>
				{item.avatar ? (
					<Image
						url={item.avatar}
						alt={item.name}
						width="40px"
						height="40px"
						borderRadius="50%"
						style={{ objectFit: "cover", flexShrink: 0 }}
					/>
				) : (
					<Box className="avatar-placeholder" />
				)}
				<Box className="tenant-info">
					<Text className="tenant-name">{item.name}</Text>
					<Text className="tenant-property">{item.property}</Text>
				</Box>
				{isOverdue && (
					<Text className="overdue-badge">
						{item.overdueDays} day
						{item.overdueDays !== 1 ? "s" : ""} overdue
					</Text>
				)}
				<Text className="amount">{item.amount}</Text>
				<Box className="action-buttons">
					<Button
						type="button"
						title="Contact"
						handleClick={() => handleContact(item)}
						borderRadius="inherit"
						background="#16a34a"
						color="white"
					/>
					<Button
						type="button"
						title="Record Payment"
						handleClick={() => handleRecordPayment(item.tenantId)}
						borderRadius="inherit"
						background="var(--Main-Blue)"
						color="white"
					/>
				</Box>
			</Box>
		),
		[handleContact, handleRecordPayment],
	);

	const renderedDueToday = useMemo(
		() => dueToday.map((item) => renderRow(item, false)),
		[dueToday, renderRow],
	);

	const renderedOverdue = useMemo(
		() => overdue.map((item) => renderRow(item, true)),
		[overdue, renderRow],
	);

	return (
		<UrgentActionsStyled>
			<Box className="section-header">
				<Text className="section-title">Urgent Actions</Text>
				{urgentActionCount > 0 && (
					<Box className="badge-count">{urgentActionCount}</Box>
				)}
			</Box>

			<Box className="subsection">
				<Text className="subsection-title">Due Today</Text>
				<Box className="action-list">
					{dueToday.length > 0 ? (
						renderedDueToday
					) : (
						<Text className="empty-state">
							No payments due today
						</Text>
					)}
				</Box>
			</Box>

			<Box className="subsection">
				<Text className="subsection-title">Overdue Payments</Text>
				<Box className="action-list">
					{overdue.length > 0 ? (
						renderedOverdue
					) : (
						<Text className="empty-state">No overdue payments</Text>
					)}
				</Box>
			</Box>
		</UrgentActionsStyled>
	);
}

export default memo(UrgentActions);
