"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { memo, type ReactNode, useContext, useMemo, useState } from "react";
import Box from "@/components/Box";
import { AppContextProvider } from "@/hooks";
import { Navbar, Toast } from "@/layouts";
import { MainStyled } from "./styled";

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
	const [excludedRoutes] = useState(["/login", "/signup"]);

	const { navHeight } = useContext(AppContextProvider);
	const pathname = usePathname();

	// const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
	const shouldExcludeNavbar = useMemo(
		() => excludedRoutes.includes(pathname),
		[pathname, excludedRoutes],
	);

	return (
		<MainStyled $navHeight={navHeight}>
			<Box className="body-wrapper">
				<Toast />

				{!shouldExcludeNavbar && (
					<Navbar
						navHeight={navHeight}
						background="var(--Secondary-600)"
					/>
				)}
				<Box className="body-container-max-width">{children}</Box>
			</Box>
		</MainStyled>
	);
}

export default memo(Main);
