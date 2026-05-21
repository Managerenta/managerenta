"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";
import { FiBell, FiDownload, FiHome, FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import { Box, Button, Text } from "@/components";
import { useAddTransactionNavigation } from "@/hooks";
import type { ITenantTransaction } from "@/types";
import { TenantQuickActionsStyled } from "./styled";

interface IProps {
	tenantId: string;
	propertyId: string;
	tenantName: string;
	transactions: ITenantTransaction[];
	onSendReminder: () => Promise<void> | void;
}

function downloadCsv(filename: string, rows: string[][]) {
	const escapeCell = (cell: string) => {
		const needs = /[",\n]/.test(cell);
		const out = cell.replace(/"/g, '""');
		return needs ? `"${out}"` : out;
	};
	const csv = rows.map((r) => r.map(escapeCell).join(",")).join("\n");
	const blob = new Blob([`﻿${csv}`], {
		type: "text/csv;charset=utf-8;",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function TenantQuickActions({
	tenantId,
	propertyId,
	tenantName,
	transactions,
	onSendReminder,
}: IProps) {
	const router = useRouter();
	const { openAddTransaction } = useAddTransactionNavigation();
	const [isSendingReminder, setIsSendingReminder] = useState(false);

	const handleAddTransaction = useCallback(() => {
		openAddTransaction(tenantId);
	}, [openAddTransaction, tenantId]);

	const handleSendReminder = useCallback(async () => {
		if (isSendingReminder) return;
		setIsSendingReminder(true);
		try {
			await onSendReminder();
		} finally {
			setIsSendingReminder(false);
		}
	}, [onSendReminder, isSendingReminder]);

	const handleViewUnit = useCallback(() => {
		if (!propertyId) {
			toast.info("Unit details unavailable for this tenant");
			return;
		}
		router.push(`/properties/${propertyId}`);
	}, [router, propertyId]);

	const handleDownloadReport = useCallback(() => {
		if (transactions.length === 0) {
			toast.info("No transactions to export");
			return;
		}
		const header = [
			"Date",
			"Type",
			"Description",
			"Payment Method",
			"Amount",
			"Direction",
			"Running Balance",
		];
		const body = transactions.map((t) => [
			t.date,
			t.type,
			t.description,
			t.paymentMethod,
			t.amount,
			t.amountType,
			t.runningBalance,
		]);
		const safeName = tenantName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
		downloadCsv(`${safeName || "tenant"}-statement.csv`, [header, ...body]);
		toast.success("Statement downloaded");
	}, [transactions, tenantName]);

	const actions = useMemo(
		() => [
			{
				id: "tqa-002",
				label: isSendingReminder
					? "Sending..."
					: "Send Payment Reminder",
				icon: <FiBell size={16} />,
				onClick: handleSendReminder,
				disabled: isSendingReminder,
			},
			{
				id: "tqa-003",
				label: "View Unit Details",
				icon: <FiHome size={16} />,
				onClick: handleViewUnit,
				disabled: false,
			},
			{
				id: "tqa-004",
				label: "Download Tenant Report",
				icon: <FiDownload size={16} />,
				onClick: handleDownloadReport,
				disabled: false,
			},
		],
		[
			isSendingReminder,
			handleSendReminder,
			handleViewUnit,
			handleDownloadReport,
		],
	);

	return (
		<TenantQuickActionsStyled>
			<Text className="card-title">Quick Actions</Text>
			<Box className="actions-list">
				<Box className="primary-action">
					<Button
						type="button"
						title={
							<Box
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									justifyContent: "center",
								}}
							>
								<FiPlus size={16} />
								<span>Add Transaction</span>
							</Box>
						}
						background="var(--Main-Blue)"
						color="white"
						borderRadius="8px"
						width="100%"
						handleClick={handleAddTransaction}
					/>
				</Box>
				{actions.map(({ id, label, icon, onClick, disabled }) => (
					<Box
						key={id}
						className="action-item"
						onClick={disabled ? undefined : onClick}
						style={{
							cursor: disabled ? "not-allowed" : "pointer",
							opacity: disabled ? 0.6 : 1,
						}}
					>
						<Box className="action-icon">{icon}</Box>
						<Text className="action-label">{label}</Text>
					</Box>
				))}
			</Box>
		</TenantQuickActionsStyled>
	);
}

export default memo(TenantQuickActions);
