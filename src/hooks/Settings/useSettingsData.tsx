"use client";
import { useMemo } from "react";
import { FiBell, FiClock, FiShield, FiUser } from "react-icons/fi";
import type {
	ILanguageOption,
	ISettingsTab,
	IThemeOption,
	ITimezoneOption,
} from "@/types";

export default function useSettingsData() {
	const tabs = useMemo<ISettingsTab[]>(() => {
		return [
			{
				id: "tab-001",
				label: "Account",
				value: "account",
				icon: <FiUser size={16} />,
			},
			{
				id: "tab-002",
				label: "Notifications",
				value: "notifications",
				icon: <FiBell size={16} />,
			},
			{
				id: "tab-003",
				label: "Reminders",
				value: "reminders",
				icon: <FiClock size={16} />,
			},
			{
				id: "tab-004",
				label: "Data & Privacy",
				value: "privacy",
				icon: <FiShield size={16} />,
			},
		];
	}, []);

	const themeOptions = useMemo<IThemeOption[]>(() => {
		return [
			{ id: "theme-001", label: "Light Mode", value: "light" },
			{ id: "theme-002", label: "Dark Mode", value: "dark" },
			{ id: "theme-003", label: "System Default", value: "system" },
		];
	}, []);

	const languageOptions = useMemo<ILanguageOption[]>(() => {
		return [
			{ id: "lang-001", label: "English", value: "en" },
			{ id: "lang-002", label: "French", value: "fr" },
			{ id: "lang-003", label: "Yoruba", value: "yo" },
			{ id: "lang-004", label: "Hausa", value: "ha" },
			{ id: "lang-005", label: "Igbo", value: "ig" },
		];
	}, []);

	const timezoneOptions = useMemo<ITimezoneOption[]>(() => {
		return [
			{ id: "tz-001", label: "(GMT+1) West Africa Time", value: "WAT" },
			{
				id: "tz-002",
				label: "(GMT+0) Greenwich Mean Time",
				value: "GMT",
			},
			{
				id: "tz-003",
				label: "(GMT+2) Central Africa Time",
				value: "CAT",
			},
			{
				id: "tz-004",
				label: "(GMT-5) Eastern Standard Time",
				value: "EST",
			},
			{
				id: "tz-005",
				label: "(GMT+1) Central European Time",
				value: "CET",
			},
		];
	}, []);

	const currencyOptions = useMemo(() => {
		return [
			{ id: "cur-001", label: "Nigerian Naira (₦)", value: "NGN" },
			{ id: "cur-002", label: "US Dollar ($)", value: "USD" },
			{ id: "cur-003", label: "British Pound (£)", value: "GBP" },
			{ id: "cur-004", label: "Euro (€)", value: "EUR" },
		];
	}, []);

	const dateFormatOptions = useMemo(() => {
		return [
			{ id: "df-001", label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
			{ id: "df-002", label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
			{ id: "df-003", label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
		];
	}, []);

	return {
		tabs,
		themeOptions,
		languageOptions,
		timezoneOptions,
		currencyOptions,
		dateFormatOptions,
	};
}
