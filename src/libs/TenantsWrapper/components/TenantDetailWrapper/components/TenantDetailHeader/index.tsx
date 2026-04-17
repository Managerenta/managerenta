"use client";
import Link from "next/link";
import { memo, useCallback } from "react";
import { FiBell, FiEdit2 } from "react-icons/fi";
import { Box, Button, Image, Text } from "@/components";
import { useTenantNavigation } from "@/hooks";
import type { ITenantDetail } from "@/types";
import { TenantDetailHeaderStyled } from "./styled";

interface IProps {
	tenantDetail: ITenantDetail;
	onEditTenant: () => void;
	onSendReminder: () => void;
}

function TenantDetailHeader({
	tenantDetail,
	onEditTenant,
	onSendReminder,
}: IProps) {
	const { name, property, unit, avatar } = tenantDetail;
	const { closeTenantDetail } = useTenantNavigation();

	const handleBackToTenants = useCallback(() => {
		closeTenantDetail();
	}, [closeTenantDetail]);

	return (
		<TenantDetailHeaderStyled>
			<Box className="breadcrumb">
				<Link href="/dashboard">Dashboard</Link>
				<span className="separator">&gt;</span>
				<Box className="breadcrumb-link" onClick={handleBackToTenants}>
					<Text>Tenants</Text>
				</Box>
				<span className="separator">&gt;</span>
				<Text className="current">{name}</Text>
			</Box>

			<Box className="header-row">
				<Box className="tenant-info">
					{avatar ? (
						<Image
							url={avatar}
							alt={name}
							width="56px"
							height="56px"
							borderRadius="50%"
							style={{ objectFit: "cover", flexShrink: 0 }}
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

				<Box className="action-buttons">
					<Box className="edit-btn">
						<Button
							type="button"
							title={
								<Box
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
									}}
								>
									<FiEdit2 size={16} />
									<span>Edit Tenant</span>
								</Box>
							}
							handleClick={onEditTenant}
							background="var(--Surface-Card)"
							color="var(--Black)"
							border="1px solid var(--Border-Subtle)"
							borderRadius="8px"
						/>
					</Box>
					<Box className="send-reminder-btn">
						<Button
							type="button"
							title={
								<Box
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
									}}
								>
									<FiBell size={16} />
									<span>Send Reminder</span>
								</Box>
							}
							handleClick={onSendReminder}
							background="var(--Main-Blue)"
							color="white"
							borderRadius="8px"
						/>
					</Box>
				</Box>
			</Box>
		</TenantDetailHeaderStyled>
	);
}

export default memo(TenantDetailHeader);
