"use client";
import { memo, useCallback, useMemo } from "react";
import { FiCalendar, FiMail, FiPhone } from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import { useTenantNavigation, useTenants } from "@/hooks";
import { TenantsGridStyled } from "./styled";

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

function TenantsGrid() {
	const { tenants } = useTenants();
	const { openTenantDetail } = useTenantNavigation();

	const handleViewTenant = useCallback(
		(tenantId: string) => {
			openTenantDetail(tenantId);
		},
		[openTenantDetail],
	);

	const renderedTenants = useMemo(() => {
		return tenants.map(
			({
				id,
				name,
				// avatar,
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
								{/* TODO: Replace with Image when avatars ready */}
								<Box className="avatar-placeholder" />
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
								<FiPhone size={13} />
								<Text className="detail-value">{phone}</Text>
							</Box>
							<Box className="detail-row">
								<FiMail size={13} />
								<Text className="detail-value">{email}</Text>
							</Box>
							<Box className="detail-row">
								<FiCalendar size={13} />
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
								handleClick={() => handleViewTenant(id)}
							/>
						</Box>
					</Box>
				);
			},
		);
	}, [tenants, handleViewTenant]);

	return (
		<TenantsGridStyled>
			<Box className="grid">{renderedTenants}</Box>
		</TenantsGridStyled>
	);
}

export default memo(TenantsGrid);
