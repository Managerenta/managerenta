"use client";
import { memo } from "react";
import { useSettingsNavigation } from "@/hooks";
import {
	NotificationsSettings,
	OrganizationsSettings,
	Preferences,
	PrivacySettings,
	ProfileInformation,
	RemindersSettings,
	Security,
	SettingsFooter,
	SettingsHeader,
} from "./components";
import { SettingsWrapperStyled } from "./styled";

function SettingsWrapper() {
	const { activeTab } = useSettingsNavigation();

	return (
		<SettingsWrapperStyled>
			<SettingsHeader />

			{activeTab === "account" && (
				<>
					<ProfileInformation />
					<Security />
					<Preferences />
				</>
			)}

			{activeTab === "organizations" && <OrganizationsSettings />}
			{activeTab === "notifications" && <NotificationsSettings />}
			{activeTab === "reminders" && <RemindersSettings />}
			{activeTab === "privacy" && <PrivacySettings />}

			<SettingsFooter />
		</SettingsWrapperStyled>
	);
}

export default memo(SettingsWrapper);
