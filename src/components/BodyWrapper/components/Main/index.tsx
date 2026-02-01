"use client";
import dynamic from "next/dynamic";
import { memo, type ReactNode, useContext } from "react";
import { BoxStyled as Box } from "@/components/Box/styled";
import { AppContextProvider } from "@/hooks";
import { MainStyled } from "./styled";
import { Navbar, Toast } from "@/layouts";

export const Modal = dynamic(
	() => import("@/layouts").then((mod) => mod.Modal),
	{
		ssr: false,
	},
);

interface IProps {
	children: ReactNode;
}

function Main({ children }: IProps) {
	const { navHeight } = useContext(AppContextProvider);

	return (
		<MainStyled $navHeight={navHeight}>
			<Box className="body-wrapper">
				<Toast />

				<Navbar navHeight={navHeight} background="var(--Secondary-600)" />
				<Box className="body-container-max-width">{children}</Box>
			</Box>
		</MainStyled>
	);
}

export default memo(Main);
