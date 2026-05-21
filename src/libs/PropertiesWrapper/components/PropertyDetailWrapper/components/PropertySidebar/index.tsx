"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";
import { FiBell, FiDownload, FiFileText, FiPlus } from "react-icons/fi";
import { Box, Button, Image, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import type { IPropertyUnit, ITopTenant } from "@/types";
import { PropertySidebarStyled } from "./styled";

interface IProps {
	propertyName: string;
	units: IPropertyUnit[];
	topTenants: ITopTenant[];
	averageVacancyDays: string;
	rentCollectedThisYear: string;
	onAddUnit: () => void;
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

function PropertySidebar({
	propertyName,
	units,
	topTenants,
	averageVacancyDays,
	rentCollectedThisYear,
	onAddUnit,
}: IProps) {
	const toast = useToast();
	const router = useRouter();
	const [isSendingAll, setIsSendingAll] = useState(false);

	const occupiedTenantIds = useMemo(
		() =>
			units
				.filter((u) => u.status === "Occupied" && u.tenantId)
				.map((u) => u.tenantId as string),
		[units],
	);

	const handleViewTransactions = useCallback(() => {
		router.push("/tenants");
	}, [router]);

	const handleSendReminderToAll = useCallback(async () => {
		if (isSendingAll) return;
		if (occupiedTenantIds.length === 0) {
			toast.push("No occupied units to remind");
			return;
		}
		setIsSendingAll(true);
		try {
			const results = await Promise.allSettled(
				occupiedTenantIds.map((id) =>
					api().post(`/api/tenants/${id}/send-reminder`),
				),
			);
			const failures = results.filter(
				(r) => r.status === "rejected",
			).length;
			if (failures === 0) {
				toast.push(
					`Reminder sent to ${occupiedTenantIds.length} tenant${
						occupiedTenantIds.length !== 1 ? "s" : ""
					}`,
					{ type: "success" },
				);
			} else {
				toast.push(
					`Sent ${occupiedTenantIds.length - failures}/${occupiedTenantIds.length}; ${failures} failed`,
					{ type: "warn" },
				);
			}
		} catch (err) {
			toast.push(getErrorMessage(err, "Failed to send reminders"), {
				type: "warn",
			});
		} finally {
			setIsSendingAll(false);
		}
	}, [occupiedTenantIds, isSendingAll, toast]);

	const handleExportReport = useCallback(() => {
		if (units.length === 0) {
			toast.push("No units to export");
			return;
		}
		const header = [
			"Unit",
			"Status",
			"Tenant",
			"Monthly Rent",
			"Payment Status",
			"Due Date",
			"Vacant Days",
		];
		const body = units.map((u) => [
			u.name,
			u.status,
			u.tenantName ?? "",
			u.rent,
			u.paymentStatus ?? "",
			u.dueDate ?? "",
			u.vacantDays !== undefined ? String(u.vacantDays) : "",
		]);
		const safeName = propertyName
			.replace(/[^a-z0-9]+/gi, "-")
			.toLowerCase();
		downloadCsv(`${safeName || "property"}-report.csv`, [header, ...body]);
		toast.push("Property report downloaded", { type: "success" });
	}, [units, propertyName, toast]);

	const secondaryActions = useMemo(
		() => [
			{
				id: "qa-002",
				label: "View All Transactions",
				icon: <FiFileText size={16} />,
				onClick: handleViewTransactions,
				disabled: false,
			},
			{
				id: "qa-003",
				label: isSendingAll ? "Sending..." : "Send Reminder to All",
				icon: <FiBell size={16} />,
				onClick: handleSendReminderToAll,
				disabled: isSendingAll,
			},
			{
				id: "qa-004",
				label: "Export Property Report",
				icon: <FiDownload size={16} />,
				onClick: handleExportReport,
				disabled: false,
			},
		],
		[
			handleViewTransactions,
			handleSendReminderToAll,
			handleExportReport,
			isSendingAll,
		],
	);

	const renderedTopTenants = useMemo(() => {
		if (topTenants.length === 0)
			return <Text className="no-tenants">No data yet</Text>;
		return topTenants.map(
			({ id, name, unit, monthlyRent, avatar }, index) => (
				<Box key={id ?? index} className="tenant-row">
					<Box className="tenant-avatar">
						{avatar ? (
							<Image
								url={avatar}
								alt={name}
								width="32px"
								height="32px"
								borderRadius="50%"
								style={{ objectFit: "cover" }}
							/>
						) : (
							<Box className="avatar-placeholder" />
						)}
					</Box>
					<Box className="tenant-info">
						<Text className="tenant-name">{name}</Text>
						<Text className="tenant-unit">{unit}</Text>
					</Box>
					<Text className="tenant-amount">{monthlyRent}</Text>
				</Box>
			),
		);
	}, [topTenants]);

	return (
		<PropertySidebarStyled>
			<Box className="quick-actions-card">
				<Text className="card-title">Quick Actions</Text>
				<Box className="actions-list">
					<Box className="add-unit-action">
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
									<span>Add New Unit</span>
								</Box>
							}
							background="var(--Main-Blue)"
							color="white"
							borderRadius="8px"
							width="100%"
							handleClick={onAddUnit}
						/>
					</Box>
					{secondaryActions.map(
						({ id, label, icon, onClick, disabled }) => (
							<Box
								key={id}
								className="action-item"
								onClick={disabled ? undefined : onClick}
								style={{
									cursor: disabled
										? "not-allowed"
										: "pointer",
									opacity: disabled ? 0.6 : 1,
								}}
							>
								<Box className="action-icon">{icon}</Box>
								<Text className="action-label">{label}</Text>
							</Box>
						),
					)}
				</Box>
			</Box>

			<Box className="statistics-card">
				<Text className="card-title">Property Statistics</Text>

				<Box className="stat-row">
					<Text className="stat-label">Average Vacancy Duration</Text>
					<Text className="stat-value-text">
						{averageVacancyDays}
					</Text>
				</Box>

				<Box className="stat-row">
					<Text className="stat-label">Rent Collected This Year</Text>
					<Text className="stat-value-text bold">
						{rentCollectedThisYear}
					</Text>
				</Box>

				<Box className="top-tenants">
					<Text className="stat-subtitle">Top Paying Tenants</Text>
					<Box className="tenants-list">{renderedTopTenants}</Box>
				</Box>
			</Box>
		</PropertySidebarStyled>
	);
}

export default memo(PropertySidebar);
