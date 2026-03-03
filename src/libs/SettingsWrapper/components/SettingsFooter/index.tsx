"use client";
import { memo } from "react";
import { Box, Text } from "@/components";
import { SettingsFooterStyled } from "./styled";

function SettingsFooter() {
	return (
		<SettingsFooterStyled>
			<Box className="footer-left">
				<Text className="version">PropertyTrack v2.4.1</Text>
				<Text className="footer-link">Help Center</Text>
				<Text className="footer-link">Contact Support</Text>
			</Box>
			<Box className="footer-right">
				<Text className="footer-link">Rate PropertyTrack</Text>
				<Text className="footer-link">What&apos;s New</Text>
			</Box>
		</SettingsFooterStyled>
	);
}

export default memo(SettingsFooter);
