"use client";
import { memo, useContext, useMemo, useState } from "react";
import { Box, Text } from "@/components";
import { type Theme, ThemeContextProvider, useSettingsData } from "@/hooks";
import { PreferencesStyled } from "./styled";

function Preferences() {
	const [currency, setCurrency] = useState<string>("NGN");
	const [dateFormat, setDateFormat] = useState<string>("DD/MM/YYYY");
	const [language, setLanguage] = useState<string>("en");
	const { theme, setTheme } = useContext(ThemeContextProvider);
	const [timezone, setTimezone] = useState<string>("WAT");

	const {
		themeOptions,
		languageOptions,
		timezoneOptions,
		currencyOptions,
		dateFormatOptions,
	} = useSettingsData();

	const renderedCurrencyOptions = useMemo(() => {
		return currencyOptions.map(({ id, label, value }) => (
			<option key={id} value={value}>
				{label}
			</option>
		));
	}, [currencyOptions]);

	const renderedDateFormatOptions = useMemo(() => {
		return dateFormatOptions.map(({ id, label, value }) => (
			<option key={id} value={value}>
				{label}
			</option>
		));
	}, [dateFormatOptions]);

	const renderedLanguageOptions = useMemo(() => {
		return languageOptions.map(({ id, label, value }) => (
			<option key={id} value={value}>
				{label}
			</option>
		));
	}, [languageOptions]);

	const renderedThemeOptions = useMemo(() => {
		return themeOptions.map(({ id, label, value }) => (
			<Box
				key={id}
				className="radio-item"
				onClick={() => setTheme(value as Theme)}
			>
				<Box
					className={`radio-circle ${theme === value ? "active" : ""}`}
				>
					{theme === value && <Box className="radio-dot" />}
				</Box>
				<Text className="radio-label">{label}</Text>
			</Box>
		));
	}, [themeOptions, theme, setTheme]);

	const renderedTimezoneOptions = useMemo(() => {
		return timezoneOptions.map(({ id, label, value }) => (
			<option key={id} value={value}>
				{label}
			</option>
		));
	}, [timezoneOptions]);

	return (
		<PreferencesStyled>
			<Text className="section-title">Preferences</Text>

			<Box className="preferences-grid">
				<Box className="left-prefs">
					<Box className="form-field">
						<Text className="field-label">Currency Display</Text>
						<select
							className="pref-select"
							value={currency}
							onChange={(e) => setCurrency(e.target.value)}
						>
							{renderedCurrencyOptions}
						</select>
					</Box>

					<Box className="form-field">
						<Text className="field-label">Date Format</Text>
						<select
							className="pref-select"
							value={dateFormat}
							onChange={(e) => setDateFormat(e.target.value)}
						>
							{renderedDateFormatOptions}
						</select>
					</Box>

					<Box className="form-field">
						<Text className="field-label">Language</Text>
						<select
							className="pref-select"
							value={language}
							onChange={(e) => setLanguage(e.target.value)}
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
							value={timezone}
							onChange={(e) => setTimezone(e.target.value)}
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
