"use client";
import { memo, useCallback, useMemo } from "react";
import { FiCalendar, FiMail, FiPhone } from "react-icons/fi";
import { Box, Button, Image, Text } from "@/components";
import { useTenantNavigation } from "@/hooks";
import type { ITenantListItem } from "@/types";
import { TenantsGridStyled } from "./styled";

interface IProps {
	tenants: ITenantListItem[];
	isLoading: boolean;
}

function getPaymentStatusStyle(status: string): { bg: string; text: string } {
	switch (status) {
		case "Paid":
			return { bg: "#dcfce7", text: "#16a34a" };
		case "Due Soon":
			return { bg: "#fef3c7", text: "#ca8a04" };
		case "Overdue":
			return { bg: "#fee2e2", text: "#ef4444" };
		default:
			return { bg: "#f1f5f9", text: "#64748b" };
	}
}

function TenantsGrid({ tenants, isLoading }: IProps) {
	const { openTenantDetail } = useTenantNavigation();

	const handleViewTenant = useCallback(
		(tenantId: string) => {
			openTenantDetail(tenantId);
		},
		[openTenantDetail],
	);

	const renderedTenants = useMemo(() => {
		if (isLoading) {
			return Array.from({ length: 6 }, (_, i) => (
				<Box key={i} className="tenant-card skeleton" />
			));
		}
		if (tenants.length === 0) {
			return (
				<Box
					className="empty-state"
					style={{
						color: "var(--Secondary-700)",
						fontWeight: "600",
					}}
				>
					<Text>No tenants found.</Text>
				</Box>
			);
		}
		return tenants.map(
			({
				id,
				name,
				avatar,
				property,
				unit,
				monthlyRent,
				paymentStatus,
				moveInDate,
				phone,
				email,
				leaseExpiry,
			}) => {
				const statusStyle = getPaymentStatusStyle(paymentStatus);

				return (
					<Box key={id} className="tenant-card">
						<Box className="card-top">
							<Box className="tenant-info">
								{avatar ? (
									<Image
										url={avatar}
										alt={name}
										width="60px"
										height="60px"
										borderRadius="50%"
										style={{
											objectFit: "cover",
											flexShrink: 0,
										}}
									/>
								) : (
									<Box className="avatar-placeholder" />
								)}
								<Box className="info-text">
									<Text className="tenant-name">{name}</Text>
									<Text className="tenant-property">
										{property} - {unit}
									</Text>
								</Box>
							</Box>
							<Box
								className="payment-badge"
								style={{
									background: statusStyle.bg,
									color: statusStyle.text,
								}}
							>
								{paymentStatus}
							</Box>
						</Box>

						<Box className="card-details">
							<Box className="detail-row">
								<FiPhone size={18} />
								<Text className="detail-value">{phone}</Text>
							</Box>
							<Box className="detail-row">
								<FiMail size={18} />
								<Text className="detail-value">{email}</Text>
							</Box>
							<Box className="detail-row">
								<FiCalendar size={18} />
								<Text className="detail-value">
									Move-in: {moveInDate}
								</Text>
							</Box>
						</Box>

						<Box className="card-footer">
							<Box className="rent-info">
								<Text className="rent-label">Monthly Rent</Text>
								<Text className="rent-value">
									{monthlyRent}
								</Text>
							</Box>
							<Box className="lease-info">
								<Text className="lease-label">
									Lease Expiry
								</Text>
								<Text className="lease-value">
									{leaseExpiry}
								</Text>
							</Box>
						</Box>

						<Box className="card-action">
							<Button
								type="button"
								title="View Tenant"
								background="inherit"
								handleClick={() => handleViewTenant(id)}
							/>
						</Box>
					</Box>
				);
			},
		);
	}, [tenants, isLoading, handleViewTenant]);

	return (
		<TenantsGridStyled>
			<Box className="grid">{renderedTenants}</Box>
		</TenantsGridStyled>
	);
}

export default memo(TenantsGrid);
