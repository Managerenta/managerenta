"use client";
import { memo, useMemo } from "react";
import { Box, Button, Text } from "@/components";
import { useSettingsData, useSettingsNavigation } from "@/hooks";
import { SettingsHeaderStyled } from "./styled";

function SettingsHeader() {
	const { tabs } = useSettingsData();
	const { activeTab, openTab } = useSettingsNavigation();

	const renderedTabs = useMemo(() => {
		return tabs.map(({ id, label, value, icon }) => (
			<Box
				key={id}
				className={`tab-item ${activeTab === value ? "active" : ""}`}>
				<Button
					type="button"
					title={
						<Box style={{ display: "flex", alignItems: "center", gap: "6px" }}>
							{icon}
							<span>{label}</span>
						</Box>
					}
					handleClick={() => openTab(value)}
				/>
			</Box>
		));
	}, [tabs, activeTab, openTab]);

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
