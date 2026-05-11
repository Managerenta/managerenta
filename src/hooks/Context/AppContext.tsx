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
}: {
	children: React.ReactNode;
	env: IEnv;
	isUserSessionActive: boolean;
}) {
	const [isUserLoggedIn, setIsUserLoggedIn] =
		useState<boolean>(isUserSessionActive);
<<<<<<< HEAD
	const userName = useMemo(() => "", []);
=======
>>>>>>> 67d2f4cd098a3cd970f52c0a6f858ee8331ce6cd

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
			cookieHeader: isBrowser ? document.cookie : "",
		});

<<<<<<< HEAD
		_setIsUserLoggedIn(result);
	}, [isBrowser]);
=======
		setIsUserLoggedIn(result);
	}, []);
>>>>>>> 67d2f4cd098a3cd970f52c0a6f858ee8331ce6cd

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
			}}>
			{children}
		</AppContextProvider.Provider>
	);
}
