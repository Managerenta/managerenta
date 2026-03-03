"use client";
import Link from "next/link";
import { memo, useCallback } from "react";
import { FiBell, FiEdit2 } from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import { usePropertiesNavigation, useTenantNavigation } from "@/hooks";
import type { ITenantDetail } from "@/types";
import { TenantDetailHeaderStyled } from "./styled";

interface IProps {
	tenantDetail: ITenantDetail;
}

function TenantDetailHeader({ tenantDetail }: IProps) {
	const { name, property, unit } = tenantDetail;
	const { closeTenantDetail } = useTenantNavigation();
	const { closePropertyDetail } = usePropertiesNavigation();

	const handleBackToUnit = useCallback(() => {
		closeTenantDetail();
	}, [closeTenantDetail]);

	const handleBackToProperties = useCallback(() => {
		closePropertyDetail();
	}, [closePropertyDetail]);

	return (
		<TenantDetailHeaderStyled>
			<Box className="breadcrumb">
				<Link href="/dashboard">Dashboard</Link>
				<span className="separator">&gt;</span>
				<Box
					className="breadcrumb-link"
					onClick={handleBackToProperties}
				>
					<Text>Properties</Text>
				</Box>
				<span className="separator">&gt;</span>
				<Text className="breadcrumb-text">{property}</Text>
				<span className="separator">&gt;</span>
				<Box className="breadcrumb-link" onClick={handleBackToUnit}>
					<Text>{unit}</Text>
				</Box>
				<span className="separator">&gt;</span>
				<Text className="current">{name}</Text>
			</Box>

			<Box className="header-row">
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
							background="white"
							color="var(--Black)"
							border="1px solid #e2e8f0"
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
