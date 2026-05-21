"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";
import { FiBell, FiDownload, FiFileText, FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import { Box, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { useDashboardData } from "@/hooks";
import { QuickActionsStyled } from "./styled";

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

function QuickActions() {
	const router = useRouter();
	const { dueToday, overdue, transactions } = useDashboardData();
	const [isSendingReminders, setIsSendingReminders] = useState(false);

	const handleAddProperty = useCallback(() => {
		router.push("/properties");
	}, [router]);

	const handleRecordTransaction = useCallback(() => {
		router.push("/tenants");
	}, [router]);

	const handleSendReminders = useCallback(async () => {
		if (isSendingReminders) return;
		const tenantIds = Array.from(
			new Set([
				...dueToday.map((t) => t.tenantId),
				...overdue.map((t) => t.tenantId),
			]),
		);
		if (tenantIds.length === 0) {
			toast.info("No tenants need reminders right now");
			return;
		}
		setIsSendingReminders(true);
		try {
			const results = await Promise.allSettled(
				tenantIds.map((id) =>
					api().post(`/api/tenants/${id}/send-reminder`),
				),
			);
			const failures = results.filter(
				(r) => r.status === "rejected",
			).length;
			if (failures === 0) {
				toast.success(
					`Reminder sent to ${tenantIds.length} tenant${tenantIds.length !== 1 ? "s" : ""}`,
				);
			} else {
				toast.warn(
					`Sent ${tenantIds.length - failures}/${tenantIds.length}; ${failures} failed`,
				);
			}
		} catch (err) {
			toast.error(getErrorMessage(err, "Failed to send reminders"));
		} finally {
			setIsSendingReminders(false);
		}
	}, [dueToday, overdue, isSendingReminders]);

	const handleExportReport = useCallback(() => {
		if (transactions.length === 0) {
			toast.info("No recent transactions to export");
			return;
		}
		const header = ["Date", "Tenant", "Unit", "Amount", "Direction"];
		const body = transactions.map((t) => [
			t.date,
			t.name,
			t.unit,
			t.amount,
			t.type,
		]);
		const today = new Date().toISOString().split("T")[0];
		downloadCsv(`dashboard-transactions-${today}.csv`, [header, ...body]);
		toast.success("Report downloaded");
	}, [transactions]);

	const actions = useMemo(
		() => [
			{
				id: "qa-add-property",
				label: "Add Property",
				icon: <FiPlus size={18} />,
				onClick: handleAddProperty,
				disabled: false,
			},
			{
				id: "qa-record-txn",
				label: "Record Transaction",
				icon: <FiFileText size={18} />,
				onClick: handleRecordTransaction,
				disabled: false,
			},
			{
				id: "qa-send-reminders",
				label: isSendingReminders ? "Sending..." : "Send Reminders",
				icon: <FiBell size={18} />,
				onClick: handleSendReminders,
				disabled: isSendingReminders,
			},
			{
				id: "qa-export",
				label: "Export Report",
				icon: <FiDownload size={18} />,
				onClick: handleExportReport,
				disabled: false,
			},
		],
		[
			handleAddProperty,
			handleRecordTransaction,
			handleSendReminders,
			handleExportReport,
			isSendingReminders,
		],
	);

	const renderedActions = useMemo(() => {
		return actions.map(({ id, label, icon, onClick, disabled }) => (
			<Box
				key={id}
				className="quick-action-item"
				onClick={disabled ? undefined : onClick}
				style={{
					cursor: disabled ? "not-allowed" : "pointer",
					opacity: disabled ? 0.6 : 1,
				}}
			>
				<Box className="action-icon">{icon}</Box>
				<Text className="action-label">{label}</Text>
			</Box>
		));
	}, [actions]);

	return (
		<QuickActionsStyled>
			<Text className="section-title">Quick Actions</Text>
			<Box className="actions-list">{renderedActions}</Box>
		</QuickActionsStyled>
	);
}

export default memo(QuickActions);
