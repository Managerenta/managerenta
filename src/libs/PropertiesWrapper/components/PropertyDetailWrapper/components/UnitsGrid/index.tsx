"use client";
import { memo, useCallback, useMemo, useState } from "react";
import { Box, Button, Image, Text } from "@/components";
import { useAddTransactionNavigation, useTenantNavigation } from "@/hooks";
import type { IPropertyUnit } from "@/types";
import { UnitsGridStyled } from "./styled";

interface IProps {
	units: IPropertyUnit[];
	totalCount: number;
	onAddTenant: (unit: IPropertyUnit) => void;
}

function getPaymentStatusColor(status: string): { bg: string; text: string } {
	switch (status) {
		case "Paid":
			return { bg: "transparent", text: "#16a34a" };
		case "Due Soon":
			return { bg: "transparent", text: "#ca8a04" };
		case "Overdue":
			return { bg: "transparent", text: "#ef4444" };
		default:
			return { bg: "transparent", text: "#64748b" };
	}
}

function UnitsGrid({ units, totalCount, onAddTenant }: IProps) {
	const [activeFilter, setActiveFilter] = useState<string>("all");
	const [sortBy, setSortBy] = useState<string>("unit-number");
	const { openTenantDetail } = useTenantNavigation();
	const { openAddTransaction } = useAddTransactionNavigation();

	const handleViewTenant = useCallback(
		(tenantId: string) => {
			openTenantDetail(tenantId);
		},
		[openTenantDetail],
	);

	const handleRecordPayment = useCallback(
		(tenantId?: string) => {
			if (!tenantId) return;
			openAddTransaction(tenantId);
		},
		[openAddTransaction],
	);

	const filterTabs = useMemo(() => {
		return [
			{ id: "tab-all", label: "All Units", value: "all" },
			{ id: "tab-occupied", label: "Occupied", value: "occupied" },
			{ id: "tab-vacant", label: "Vacant", value: "vacant" },
		];
	}, []);

	const renderedFilterTabs = useMemo(() => {
		return filterTabs.map(({ id, label, value }) => (
			<Box
				key={id}
				className={`filter-tab ${activeFilter === value ? "active" : ""}`}
			>
				<Button
					type="button"
					title={label}
					handleClick={() => setActiveFilter(value)}
				/>
			</Box>
		));
	}, [filterTabs, activeFilter]);

	const filteredUnits = useMemo(() => {
		const filtered =
			activeFilter === "occupied"
				? units.filter((u) => u.status === "Occupied")
				: activeFilter === "vacant"
					? units.filter((u) => u.status === "Vacant")
					: units;

		return [...filtered].sort((a, b) => {
			switch (sortBy) {
				case "status":
					return a.status.localeCompare(b.status);
				case "rent":
					return b.rentAmount - a.rentAmount;
				default:
					return a.name.localeCompare(b.name, undefined, {
						numeric: true,
					});
			}
		});
	}, [units, activeFilter, sortBy]);

	const renderedUnits = useMemo(() => {
		return filteredUnits.map(
			({
				id,
				name,
				status,
				tenantId,
				tenantName,
				tenantAvatar,
				rent,
				rentAmount,
				dueDate,
				paymentStatus,
				vacantDays,
			}) => {
				const isOccupied = status === "Occupied";
				const paymentColors = paymentStatus
					? getPaymentStatusColor(paymentStatus)
					: null;

				return (
					<Box key={id} className="unit-card">
						<Text className="unit-name">{name}</Text>

						<Box
							className="status-badge"
							style={{
								background: isOccupied ? "#dcfce7" : "#fee2e2",
								color: isOccupied ? "#16a34a" : "#ef4444",
							}}
						>
							{status}
						</Box>

						{isOccupied && tenantName && (
							<Box className="tenant-row">
								{tenantAvatar ? (
									<Image
										url={tenantAvatar}
										alt={tenantName}
										width="38px"
										height="38px"
										borderRadius="50%"
										style={{
											objectFit: "cover",
											flexShrink: 0,
										}}
									/>
								) : (
									<Box className="avatar-placeholder" />
								)}
								<Text className="tenant-name">
									{tenantName}
								</Text>
							</Box>
						)}

						<Text className="unit-rent">{rent}</Text>

						{isOccupied && dueDate && (
							<Text className="due-date">{dueDate}</Text>
						)}

						{isOccupied && paymentStatus && paymentColors && (
							<Box className="payment-status">
								<Box
									className="payment-dot"
									style={{ background: paymentColors.text }}
								/>
								<Text
									style={{
										color: paymentColors.text,
										fontSize: "13px",
									}}
								>
									{paymentStatus}
								</Text>
							</Box>
						)}

						{!isOccupied && vacantDays && (
							<Text className="vacant-info">
								Vacant for {vacantDays} days
							</Text>
						)}

						{!isOccupied && (
							<Text className="expected-rent">Expected rent</Text>
						)}

						<Box className="unit-actions">
							{isOccupied ? (
								<>
									<Box className="view-tenant-btn">
										<Button
											type="button"
											title="View Tenant"
											background="#16a34a"
											color="white"
											borderRadius="8px"
											handleClick={() =>
												tenantId &&
												handleViewTenant(tenantId)
											}
										/>
									</Box>
									<Box className="record-btn">
										<Button
											type="button"
											title="Record Payment"
											background="#ef4444"
											color="white"
											borderRadius="8px"
											handleClick={() =>
												handleRecordPayment(tenantId)
											}
										/>
									</Box>
								</>
							) : (
								<Box className="add-tenant-btn">
									<Button
										type="button"
										title={
											<Box
												style={{
													display: "flex",
													alignItems: "center",
													gap: "6px",
												}}
											>
												<span>+ Add Tenant</span>
											</Box>
										}
										handleClick={() =>
											onAddTenant({
												id,
												name,
												status,
												rent,
												rentAmount,
												dueDate,
												paymentStatus,
												vacantDays,
											})
										}
										background="var(--Main-Blue)"
										color="white"
										borderRadius="8px"
										width="100%"
									/>
								</Box>
							)}
						</Box>
					</Box>
				);
			},
		);
	}, [filteredUnits, handleViewTenant, handleRecordPayment, onAddTenant]);

	return (
		<UnitsGridStyled>
			<Box className="units-header">
				<Box className="units-title-row">
					<Text className="units-title">Units</Text>
					<Box className="units-count">{totalCount}</Box>
				</Box>

				<Box className="units-filters">
					<Box className="filter-tabs">{renderedFilterTabs}</Box>

					<select
						className="sort-dropdown"
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
					>
						<option value="unit-number">Unit Number</option>
						<option value="status">Status</option>
						<option value="rent">Rent</option>
					</select>
				</Box>
			</Box>

			<Box className="units-grid">{renderedUnits}</Box>
		</UnitsGridStyled>
	);
}

export default memo(UnitsGrid);
