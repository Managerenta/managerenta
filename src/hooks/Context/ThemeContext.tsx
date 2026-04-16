"use client";
import {
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface IThemeContext {
	theme: Theme;
	resolvedTheme: ResolvedTheme;
	setTheme: (theme: Theme) => void;
}

export const ThemeContextProvider = createContext<IThemeContext>({
	theme: "light",
	resolvedTheme: "light",
	setTheme: () => {},
});

const STORAGE_KEY = "property-track:theme";

function getSystemTheme(): ResolvedTheme {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
	return theme === "system" ? getSystemTheme() : theme;
}

export default function ThemeContext({
	children,
}: {
	children: React.ReactNode;
}) {
	const [theme, setThemeState] = useState<Theme>("light");
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

	useEffect(() => {
		const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
		const initial: Theme =
			stored === "light" || stored === "dark" || stored === "system"
				? stored
				: "light";
		setThemeState(initial);
		setResolvedTheme(resolveTheme(initial));
	}, []);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", resolvedTheme);
	}, [resolvedTheme]);

	useEffect(() => {
		if (theme !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) => {
			setResolvedTheme(e.matches ? "dark" : "light");
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [theme]);

	const setTheme = useCallback((next: Theme) => {
		setThemeState(next);
		setResolvedTheme(resolveTheme(next));
		window.localStorage.setItem(STORAGE_KEY, next);
	}, []);

	const value = useMemo(
		() => ({ theme, resolvedTheme, setTheme }),
		[theme, resolvedTheme, setTheme],
	);

	return (
		<ThemeContextProvider.Provider value={value}>
			{children}
		</ThemeContextProvider.Provider>
	);
}
