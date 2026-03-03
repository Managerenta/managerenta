"use client";
import { memo, useMemo } from "react";
import { Box, Text } from "@/components";
import { useAddTransactionData } from "@/hooks";
import { SmartSuggestionsPanelStyled } from "./styled";

function SmartSuggestionsPanel() {
	const { smartSuggestions } = useAddTransactionData();

	const renderedSuggestions = useMemo(() => {
		return smartSuggestions.map(
			({ id, label, description, bgColor, iconColor, icon }) => (
				<Box
					key={id}
					className="suggestion-card"
					style={{ background: bgColor }}>
					<Box className="suggestion-icon" style={{ color: iconColor }}>
						{icon}
					</Box>
					<Box className="suggestion-content">
						<Text className="suggestion-label" style={{ color: iconColor }}>
							{label}
						</Text>
						<Text className="suggestion-desc">{description}</Text>
					</Box>
				</Box>
			),
		);
	}, [smartSuggestions]);

	return (
		<SmartSuggestionsPanelStyled>
			<Text className="panel-title">Smart Suggestions</Text>
			<Box className="suggestions-list">{renderedSuggestions}</Box>
		</SmartSuggestionsPanelStyled>
	);
}

export default memo(SmartSuggestionsPanel);
