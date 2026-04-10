"use client";
import { memo, useMemo } from "react";
import { FiCreditCard, FiDollarSign, FiFileText } from "react-icons/fi";
import { Box, Text } from "@/components";
import { SmartSuggestionsPanelStyled } from "./styled";

interface IProps {
	monthlyRent: string;
}

function SmartSuggestionsPanel({ monthlyRent }: IProps) {
	const suggestions = useMemo(() => {
		return [
			{
				id: "ss-001",
				label: "Standard Rent Amount",
				description: monthlyRent
					? `This tenant's monthly rent is ${monthlyRent}`
					: "No rent amount set",
				bgColor: "#dbeafe",
				iconColor: "#2563eb",
				icon: <FiDollarSign size={16} />,
			},
			{
				id: "ss-002",
				label: "Preferred Payment Method",
				description: "Bank Transfer",
				bgColor: "#fef3c7",
				iconColor: "#d97706",
				icon: <FiCreditCard size={16} />,
			},
			{
				id: "ss-003",
				label: "Common Description",
				description: '"Monthly rent payment"',
				bgColor: "#d1fae5",
				iconColor: "#059669",
				icon: <FiFileText size={16} />,
			},
		];
	}, [monthlyRent]);

	const renderedSuggestions = useMemo(() => {
		return suggestions.map(
			({ id, label, description, bgColor, iconColor, icon }) => (
				<Box
					key={id}
					className="suggestion-card"
					style={{ background: bgColor }}
				>
					<Box
						className="suggestion-icon"
						style={{ color: iconColor }}
					>
						{icon}
					</Box>
					<Box className="suggestion-content">
						<Text
							className="suggestion-label"
							style={{ color: iconColor }}
						>
							{label}
						</Text>
						<Text className="suggestion-desc">{description}</Text>
					</Box>
				</Box>
			),
		);
	}, [suggestions]);

	return (
		<SmartSuggestionsPanelStyled>
			<Text className="panel-title">Smart Suggestions</Text>
			<Box className="suggestions-list">{renderedSuggestions}</Box>
		</SmartSuggestionsPanelStyled>
	);
}

export default memo(SmartSuggestionsPanel);
