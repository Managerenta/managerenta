"use client";
import Link from "next/link";
import { memo, useCallback } from "react";
import { FiX } from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import { useAddTransactionNavigation } from "@/hooks";
import { AddTransactionHeaderStyled } from "./styled";

interface IProps {
	tenantName: string;
	tenantId: string;
}

function AddTransactionHeader({ tenantName, tenantId }: IProps) {
	const { closeAddTransaction } = useAddTransactionNavigation();

	const handleClose = useCallback(() => {
		closeAddTransaction();
	}, [closeAddTransaction]);

	return (
		<AddTransactionHeaderStyled>
			<Box className="breadcrumb">
				<Link href="/dashboard">Dashboard</Link>
				<span className="separator">&gt;</span>
				<Link href="/tenants">Tenants</Link>
				<span className="separator">&gt;</span>
				<Link href={`/tenants/${tenantId}`}>
					{tenantName || "Tenant"}
				</Link>
				<span className="separator">&gt;</span>
				<Text className="current">Add Transaction</Text>
			</Box>

			<Box className="title-row">
				<Box className="title-section">
					<Text className="page-title">Add Transaction</Text>
					{tenantName && (
						<Text className="page-subtitle">
							Recording transaction for {tenantName}
						</Text>
					)}
				</Box>
				<Box className="close-btn">
					<Button
						type="button"
						title={<FiX size={20} />}
						handleClick={handleClose}
						background="transparent"
						color="#64748b"
						borderRadius="8px"
					/>
				</Box>
			</Box>
		</AddTransactionHeaderStyled>
	);
}

export default memo(AddTransactionHeader);
