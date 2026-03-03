"use client";
import { memo, useMemo } from "react";
import { Box, Text } from "@/components";
import { useAddTransactionData } from "@/hooks";
import { KeyboardShortcutsPanelStyled } from "./styled";

function KeyboardShortcutsPanel() {
	const { keyboardShortcuts } = useAddTransactionData();

	const renderedShortcuts = useMemo(() => {
		return keyboardShortcuts.map(({ id, label, key }) => (
			<Box key={id} className="shortcut-row">
				<Text className="shortcut-label">{label}</Text>
				<Box className="shortcut-key">{key}</Box>
			</Box>
		));
	}, [keyboardShortcuts]);

	return (
		<KeyboardShortcutsPanelStyled>
			<Text className="panel-title">Keyboard Shortcuts</Text>
			<Box className="shortcuts-list">{renderedShortcuts}</Box>
		</KeyboardShortcutsPanelStyled>
	);
}

export default memo(KeyboardShortcutsPanel);
