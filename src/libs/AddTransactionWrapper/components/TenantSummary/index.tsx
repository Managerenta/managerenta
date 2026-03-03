"use client";
import { memo } from "react";
import { Box, Text } from "@/components";
import { TenantSummaryStyled } from "./styled";

function TenantSummary() {
	return (
		<TenantSummaryStyled>
			<Box className="tenant-info">
				{/* TODO: Replace with Image when avatars ready */}
				<Box className="avatar-placeholder" />
				<Box className="info-text">
					<Text className="tenant-name">Chioma Okoro</Text>
					<Text className="tenant-property">
						Sunset Apartments - Block A, Flat 2
					</Text>
				</Box>
			</Box>

			<Box className="balance-info">
				<Text className="balance-label">Current Balance</Text>
				<Text className="balance-value">-₦450,000</Text>
				<Box className="overdue-badge">Overdue</Box>
			</Box>
		</TenantSummaryStyled>
	);
}

export default memo(TenantSummary);
