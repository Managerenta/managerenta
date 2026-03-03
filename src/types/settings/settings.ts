export interface ISettingsTab {
	id: string;
	label: string;
	value: string;
	icon: React.ReactNode;
}

export interface IThemeOption {
	id: string;
	label: string;
	value: string;
}

export interface ILanguageOption {
	id: string;
	label: string;
	value: string;
}

export interface ITimezoneOption {
	id: string;
	label: string;
	value: string;
}
