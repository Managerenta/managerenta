"use client";
import { motion } from "motion/react";
import NextTopLoader from "nextjs-toploader";
import type React from "react";
import { Fragment } from "react";
import { SWRConfig } from "swr";
import type { IEnv } from "@/constants";
import { AppContext, ThemeContext } from "@/hooks";
import { GlobalStyle } from "@/styles";
import { Main } from "./components";

interface IProps {
	children: React.ReactNode;
	env: IEnv;
	isUserSessionActive: boolean;
	userName: string;
}

export default function BodyWrapper({
	children,
	env,
	isUserSessionActive,
	userName,
}: IProps) {
	return (
		<Fragment>
			<GlobalStyle />
			<NextTopLoader />
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0 }}
			>
			<SWRConfig
				value={{
					shouldRetryOnError: false,
					revalidateOnFocus: false,
					revalidateOnMount: false,
					revalidateOnReconnect: true,
					refreshWhenOffline: true,
					refreshWhenHidden: false,
				}}
			>
				<AppContext
					env={env}
					isUserSessionActive={isUserSessionActive}
					userName={userName}
				>
					<ThemeContext>
						<Main>{children}</Main>
					</ThemeContext>
				</AppContext>
			</SWRConfig>
			</motion.div>
		</Fragment>
	);
}
