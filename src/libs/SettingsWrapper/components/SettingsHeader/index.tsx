"use client";
import { memo, useMemo } from "react";
import { FiLock } from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import {
	useOrganizations,
	useSettingsData,
	useSettingsNavigation,
} from "@/hooks";
import type { ISettingsTab } from "@/types";
import { SettingsHeaderStyled } from "./styled";

function SettingsHeader() {
	const { tabs } = useSettingsData();
	const { activeTab, openTab } = useSettingsNavigation();
	const { currentOrganizationId, role } = useOrganizations();

	// The Access / IAM tab is only meaningful to an org owner/admin inside an
	// organization workspace (the owner's role resolves to "admin"). Outside an
	// org, or for non-admins, we hide it entirely.
	const visibleTabs = useMemo<ISettingsTab[]>(() => {
		if (currentOrganizationId && role === "admin") {
			return [
				...tabs,
				{
					id: "tab-006",
					label: "Access / IAM",
					value: "access",
					icon: <FiLock size={16} />,
				},
			];
		}
		return tabs;
	}, [tabs, currentOrganizationId, role]);

	const renderedTabs = useMemo(() => {
		return visibleTabs.map(({ id, label, value, icon }) => (
			<Box
				key={id}
				className={`tab-item ${activeTab === value ? "active" : ""}`}
			>
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
							{icon}
							<span>{label}</span>
						</Box>
					}
					handleClick={() => openTab(value)}
				/>
			</Box>
		));
	}, [visibleTabs, activeTab, openTab]);

	return (
		<SettingsHeaderStyled>
			<Box className="title-section">
				<Text className="page-title">Settings</Text>
				<Text className="page-subtitle">
					Manage your account and app preferences
				</Text>
			</Box>

			<Box className="tabs-row">{renderedTabs}</Box>
		</SettingsHeaderStyled>
	);
}

export default memo(SettingsHeader);
