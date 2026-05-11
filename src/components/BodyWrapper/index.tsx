"use client";
import { motion } from "motion/react";
import NextTopLoader from "nextjs-toploader";
import type React from "react";
import { Fragment } from "react";
import { SWRConfig } from "swr";
import { verifyUserLogin, type IEnv } from "@/constants";
import { AppContext, ThemeContext } from "@/hooks";
import { GlobalStyle } from "@/styles";
import { Main } from "./components";
import { dm_sans, roboto } from "@/app/layout";
import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect, useState } from "react";

interface IProps {
	children: React.ReactNode;
	env: IEnv;
	cookieHeader: string;
}

export default function BodyWrapper({ children, env, cookieHeader }: IProps) {
	const [isUserSessionActive, setIsUserSessionActive] = useState(false);

	useEffect(() => {
		if (isUserSessionActive) return;

		(async () => {
			const result = await verifyUserLogin({ cookieHeader });

			setIsUserSessionActive(result);
		})();
	}, [isUserSessionActive, cookieHeader]);

	// if (accessToken) {
	// 	try {
	// 		decodeJwt(accessToken);
	// 		isUserSessionActive = true;

	// 		const cookieHeader = cookieStore.toString();
	// 		const profileRes = await fetch(
	// 			`${env.MAIN_SERVICE_URL}/api/users/user-profile`,
	// 			{ headers: { Cookie: cookieHeader } },
	// 		);
	// 		if (profileRes.ok) {
	// 			const body = await profileRes.json();
	// 			userName = body?.data?.name ?? body?.name ?? "";
	// 		}
	// 	} catch {
	// 		isUserSessionActive = false;
	// 	}
	// }

	return (
		<Fragment>
			<GlobalStyle />
			<NextTopLoader />
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0 }}>
				<SWRConfig
					value={{
						shouldRetryOnError: false,
						revalidateOnFocus: false,
						revalidateOnMount: false,
						revalidateOnReconnect: true,
						refreshWhenOffline: true,
						refreshWhenHidden: false,
					}}>
					<AppContext env={env} isUserSessionActive={isUserSessionActive}>
						<ThemeContext>
							<Main>{children}</Main>
						</ThemeContext>
					</AppContext>
				</SWRConfig>
			</motion.div>
		</Fragment>
	);
}
