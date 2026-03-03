"use client";
import { memo } from "react";
import { useSettingsNavigation } from "@/hooks";
import {
	Preferences,
	ProfileInformation,
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

			{activeTab === "notifications" && null}
			{activeTab === "reminders" && null}
			{activeTab === "privacy" && null}

			<SettingsFooter />
		</SettingsWrapperStyled>
	);
}

export default memo(SettingsWrapper);
