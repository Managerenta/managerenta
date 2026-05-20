"use client";
import {
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { api, type IEnv, verifyUserLogin } from "../../constants";

interface IProps {
	env: IEnv;
	navHeight: string;
	deleteAllCookies: () => Promise<boolean>;
	isBrowser: boolean;
	isUserLoggedIn: boolean;
	userName: string;
	reAuthenticateUserSession: () => Promise<void>;
}

export const AppContextProvider = createContext<IProps>({} as IProps);

export default function AppContext({
	children,
	env,
	isUserSessionActive,
}: {
	children: React.ReactNode;
	env: IEnv;
	isUserSessionActive: boolean;
}) {
	// const [isUserLoggedIn, setIsUserLoggedIn] =
	// 	useState<boolean>(isUserSessionActive);
	const [_isUserLoggedIn, _setIsUserLoggedIn] =
		useState<boolean>(isUserSessionActive);
	const userName = useMemo(() => "", []);

	const [navHeight] = useState<string>("70px");

	const isBrowser = typeof window !== "undefined";

	const deleteAllCookies = useCallback(async (): Promise<boolean> => {
		try {
			const { status } = await api().delete("/api/auth/logout", {
				baseURL: "",
			});
			if (status !== 200) return false;
			_setIsUserLoggedIn(false);
			return true;
		} catch {
			return false;
		}
	}, []);

	const reAuthenticateUserSession = useCallback(async () => {
		const result = await verifyUserLogin({
			cookieHeader: isBrowser ? document.cookie : "",
		});

		_setIsUserLoggedIn(result);
	}, [isBrowser]);

	const isUserLoggedIn = useMemo(() => _isUserLoggedIn, [_isUserLoggedIn]);

	useEffect(() => {
		if (!isBrowser) return;
		window.scrollTo({
			top: 0,
			left: 0,
			behavior: "smooth",
		});
	}, [isBrowser]);

	useEffect(() => {
		_setIsUserLoggedIn(isUserSessionActive);
	}, [isUserSessionActive]);

	return (
		<AppContextProvider.Provider
			value={{
				env,
				navHeight,
				deleteAllCookies,
				isBrowser,
				isUserLoggedIn,
				userName,
				reAuthenticateUserSession,
			}}
		>
			{children}
		</AppContextProvider.Provider>
	);
}
