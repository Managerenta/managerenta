"use client";
import { memo } from "react";
import { Box, Image, Text } from "@/components";
import { TenantSummaryStyled } from "./styled";

interface IProps {
	name: string;
	avatar: string;
	property: string;
	unit: string;
	outstandingBalance: string;
	isOverdue: boolean;
	isLoading: boolean;
}

function TenantSummary({
	name,
	avatar,
	property,
	unit,
	outstandingBalance,
	isOverdue,
	isLoading,
}: IProps) {
	return (
		<TenantSummaryStyled>
			<Box className="tenant-info">
				{avatar ? (
					<Image
						url={avatar}
						alt={name}
						width="44px"
						height="44px"
						borderRadius="50%"
						style={{ objectFit: "cover", flexShrink: 0 }}
					/>
				) : (
					<Box className="avatar-placeholder" />
				)}
				<Box className="info-text">
					<Text className="tenant-name">
						{isLoading ? "—" : name}
					</Text>
					<Text className="tenant-property">
						{isLoading ? "—" : `${property} - ${unit}`}
					</Text>
				</Box>
			</Box>

			<Box className="balance-info">
				<Text className="balance-label">Outstanding Balance</Text>
				<Text
					className="balance-value"
					style={{ color: isOverdue ? "#ef4444" : "#16a34a" }}
				>
					{isLoading ? "—" : outstandingBalance}
				</Text>
				{isOverdue && <Box className="overdue-badge">Overdue</Box>}
			</Box>
		</TenantSummaryStyled>
	);
}

export default memo(TenantSummary);
