"use client";
import { memo, useCallback, useContext, useMemo } from "react";
import { toast } from "react-toastify";
import { Box, Text } from "@/components";
import {
	type Theme,
	ThemeContextProvider,
	useSettingsData,
	useUserPreferences,
} from "@/hooks";
import { PreferencesStyled } from "./styled";

function Preferences() {
	const { preferences, update, isLoading } = useUserPreferences();
	const { theme, setTheme } = useContext(ThemeContextProvider);

	const {
		themeOptions,
		languageOptions,
		timezoneOptions,
		currencyOptions,
		dateFormatOptions,
	} = useSettingsData();

	const persist = useCallback(
		async (
			field: keyof typeof preferences,
			value: string,
		): Promise<void> => {
			try {
				await update({ [field]: value });
				toast.success("Preference saved");
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to save",
				);
			}
		},
		[update],
	);

	const renderedCurrencyOptions = useMemo(
		() =>
			currencyOptions.map(({ id, label, value }) => (
				<option key={id} value={value}>
					{label}
				</option>
			)),
		[currencyOptions],
	);
	const renderedDateFormatOptions = useMemo(
		() =>
			dateFormatOptions.map(({ id, label, value }) => (
				<option key={id} value={value}>
					{label}
				</option>
			)),
		[dateFormatOptions],
	);
	const renderedLanguageOptions = useMemo(
		() =>
			languageOptions.map(({ id, label, value }) => (
				<option key={id} value={value}>
					{label}
				</option>
			)),
		[languageOptions],
	);
	const renderedTimezoneOptions = useMemo(
		() =>
			timezoneOptions.map(({ id, label, value }) => (
				<option key={id} value={value}>
					{label}
				</option>
			)),
		[timezoneOptions],
	);
	const renderedThemeOptions = useMemo(() => {
		return themeOptions.map(({ id, label, value }) => (
			<Box
				key={id}
				className="radio-item"
				onClick={() => {
					setTheme(value as Theme);
					persist("theme", value);
				}}
			>
				<Box
					className={`radio-circle ${theme === value ? "active" : ""}`}
				>
					{theme === value && <Box className="radio-dot" />}
				</Box>
				<Text className="radio-label">{label}</Text>
			</Box>
		));
	}, [themeOptions, theme, setTheme, persist]);

	return (
		<PreferencesStyled>
			<Text className="section-title">Preferences</Text>

			<Box className="preferences-grid">
				<Box className="left-prefs">
					<Box className="form-field">
						<Text className="field-label">Currency Display</Text>
						<select
							className="pref-select"
							disabled={isLoading}
							value={preferences.currency}
							onChange={(e) =>
								persist("currency", e.target.value)
							}
						>
							{renderedCurrencyOptions}
						</select>
					</Box>

					<Box className="form-field">
						<Text className="field-label">Date Format</Text>
						<select
							className="pref-select"
							disabled={isLoading}
							value={preferences.dateFormat}
							onChange={(e) =>
								persist("dateFormat", e.target.value)
							}
						>
							{renderedDateFormatOptions}
						</select>
					</Box>

					<Box className="form-field">
						<Text className="field-label">Language</Text>
						<select
							className="pref-select"
							disabled={isLoading}
							value={preferences.language}
							onChange={(e) =>
								persist("language", e.target.value)
							}
						>
							{renderedLanguageOptions}
						</select>
					</Box>
				</Box>

				<Box className="right-prefs">
					<Box className="form-field">
						<Text className="field-label">Theme</Text>
						<Box className="radio-group">
							{renderedThemeOptions}
						</Box>
					</Box>

					<Box className="form-field">
						<Text className="field-label">Timezone</Text>
						<select
							className="pref-select"
							disabled={isLoading}
							value={preferences.timezone}
							onChange={(e) =>
								persist("timezone", e.target.value)
							}
						>
							{renderedTimezoneOptions}
						</select>
					</Box>
				</Box>
			</Box>
		</PreferencesStyled>
	);
}

export default memo(Preferences);
