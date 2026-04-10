"use client";
import { motion } from "motion/react";
import NextTopLoader from "nextjs-toploader";
import type React from "react";
import { SWRConfig } from "swr";
import type { IEnv } from "@/constants";
import { AppContext } from "@/hooks";
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
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0 }}
		>
			<GlobalStyle />
			<NextTopLoader />
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
					<Main>{children}</Main>
				</AppContext>
			</SWRConfig>
		</motion.div>
	);
}
