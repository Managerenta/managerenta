"use client";
import {
	memo,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Box, Select, Text } from "@/components";
import {
	type Theme,
	ThemeContextProvider,
	useSettingsData,
	useToast,
	useUserPreferences,
} from "@/hooks";
import { PreferencesStyled } from "./styled";

function Preferences() {
	const toast = useToast();
	const { preferences, update, isLoading: swrLoading } = useUserPreferences();
	const { theme, setTheme } = useContext(ThemeContextProvider);
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const isLoading = mounted ? swrLoading : false;

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
				toast.push("Preference saved", { type: "success" });
			} catch (err) {
				toast.push(
					err instanceof Error ? err.message : "Failed to save",
					{ type: "warn" },
				);
			}
		},
		[update, toast],
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
						<Select
							className="pref-select"
							isDisabled={isLoading}
							options={currencyOptions}
							value={preferences.currency}
							onChange={(v) => persist("currency", v)}
						/>
					</Box>

					<Box className="form-field">
						<Text className="field-label">Date Format</Text>
						<Select
							className="pref-select"
							isDisabled={isLoading}
							options={dateFormatOptions}
							value={preferences.dateFormat}
							onChange={(v) => persist("dateFormat", v)}
						/>
					</Box>

					<Box className="form-field">
						<Text className="field-label">Language</Text>
						<Select
							className="pref-select"
							isDisabled={isLoading}
							options={languageOptions}
							value={preferences.language}
							onChange={(v) => persist("language", v)}
						/>
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
						<Select
							className="pref-select"
							isDisabled={isLoading}
							options={timezoneOptions}
							value={preferences.timezone}
							onChange={(v) => persist("timezone", v)}
						/>
					</Box>
				</Box>
			</Box>
		</PreferencesStyled>
	);
}

export default memo(Preferences);
