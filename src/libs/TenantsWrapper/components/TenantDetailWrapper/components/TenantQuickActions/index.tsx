"use client";
import { memo, useMemo } from "react";
import { FiBell, FiDownload, FiHome, FiPlus } from "react-icons/fi";
import { useAddTransactionNavigation } from "@/hooks";
import { Box, Button, Text } from "@/components";
import { TenantQuickActionsStyled } from "./styled";

interface QuickActionItem {
	id: string;
	label: string;
	icon: React.ReactNode;
}

function TenantQuickActions() {
	const { openAddTransaction } = useAddTransactionNavigation();

	const actions = useMemo((): QuickActionItem[] => {
		return [
			{
				id: "tqa-001",
				label: "Add Transaction",
				icon: <FiPlus size={16} />,
			},
			{
				id: "tqa-002",
				label: "Send Payment Reminder",
				icon: <FiBell size={16} />,
			},
			{
				id: "tqa-003",
				label: "View Unit Details",
				icon: <FiHome size={16} />,
			},
			{
				id: "tqa-004",
				label: "Download Tenant Report",
				icon: <FiDownload size={16} />,
			},
		];
	}, []);

	const renderedActions = useMemo(() => {
		return actions.map(({ id, label, icon }) => {
			if (id === "tqa-001") {
				return (
					<Box key={id} className="primary-action">
						<Button
							type="button"
							title={
								<Box
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										justifyContent: "center",
									}}>
									{icon}
									<span>{label}</span>
								</Box>
							}
							background="var(--Main-Blue)"
							color="white"
							borderRadius="8px"
							width="100%"
							handleClick={openAddTransaction}
						/>
					</Box>
				);
			}

			return (
				<Box key={id} className="action-item">
					<Box className="action-icon">{icon}</Box>
					<Text className="action-label">{label}</Text>
				</Box>
			);
		});
	}, [actions]);

	return (
		<TenantQuickActionsStyled>
			<Text className="card-title">Quick Actions</Text>
			<Box className="actions-list">{renderedActions}</Box>
		</TenantQuickActionsStyled>
	);
}

export default memo(TenantQuickActions);
