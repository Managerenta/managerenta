"use client";
import {
	createContext,
	useCallback,
	useEffect,
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
	userName,
}: {
	children: React.ReactNode;
	env: IEnv;
	isUserSessionActive: boolean;
	userName: string;
}) {
	const [isUserLoggedIn, setIsUserLoggedIn] =
		useState<boolean>(isUserSessionActive);

	const [navHeight] = useState<string>("70px");

	const isBrowser = typeof window !== "undefined";

	const deleteAllCookies = useCallback(async (): Promise<boolean> => {
		try {
			const { status } = await api().delete("/api/logout");
			if (status !== 200) return false;
			setIsUserLoggedIn(false);
			return true;
		} catch {
			return false;
		}
	}, []);

	const reAuthenticateUserSession = useCallback(async () => {
		const result = await verifyUserLogin({
			url: "/api/auth/verify",
		});

		setIsUserLoggedIn(result);
	}, []);

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
				userName,
				reAuthenticateUserSession,
			}}
		>
			{children}
		</AppContextProvider.Provider>
	);
}
