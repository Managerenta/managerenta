"use client";
import {
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { api, IEnv, verifyUserLogin } from "../../constants";

interface IProps {
	env: IEnv;
	navHeight: string;
	deleteAllCookies: () => void;
	isBrowser: boolean;
	isUserLoggedIn: boolean;
	reAuthenticateUserSession: () => Promise<void>;
}

export const AppContextProvider = createContext<IProps>({} as IProps);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AppContext({
	children,
	env: _env,
	isUserSessionActive,
}: {
	children: React.ReactNode;
	env: IEnv;
	isUserSessionActive: boolean;
}) {
	const [_isUserLoggedIn, _setIsUserLoggedIn] =
		useState<boolean>(isUserSessionActive);

	const [navHeight] = useState<string>("70px");

	const isUserLoggedIn = useMemo(() => _isUserLoggedIn, [_isUserLoggedIn]);

	const env = useMemo(() => _env, [_env]);

	const isBrowser = useMemo(() => typeof window !== "undefined", []); //The approach recommended by Next.js

	const deleteAllCookies = useCallback(async (): Promise<boolean> => {
		try {
			const url = "/api/logout";
			const { status } = await api().delete(url);
			if (status !== 200) return false;
			return true;
		} catch {
			return false;
		}
	}, []);

	const reAuthenticateUserSession = useCallback(async () => {
		const url = `${env.MAIN_SERVICE_URL}/api/login/verify`;

		const result = await verifyUserLogin({
			url,
		});

		_setIsUserLoggedIn(result);
	}, [env.MAIN_SERVICE_URL]);

	useEffect(() => {
		if (!isBrowser) return;
		window.scrollTo({
			top: 0,
			left: 0,
			behavior: "smooth",
		});
	}, [isBrowser]);

	return (
		<AppContextProvider.Provider
			value={{
				env,
				navHeight,
				deleteAllCookies,
				isBrowser,
				isUserLoggedIn,
				reAuthenticateUserSession,
			}}>
			{children}
		</AppContextProvider.Provider>
	);
}
