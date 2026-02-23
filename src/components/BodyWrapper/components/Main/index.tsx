"use client";
import { usePathname } from "next/navigation";
import { memo, type ReactNode, useContext, useMemo, useState } from "react";
import Box from "@/components/Box";
import { AppContextProvider } from "@/hooks";
import { Toast } from "@/layouts";
import { AdminDashboardWrapper } from "./components";
import { MainStyled } from "./styled";

interface IProps {
	children: ReactNode;
}

function Main({ children }: IProps) {
	const [excludedRoutes] = useState(["/login", "/signup", "/"]);
	const { navHeight } = useContext(AppContextProvider);
	const pathname = usePathname();

	const isAuthRoute = useMemo(
		() => excludedRoutes.includes(pathname),
		[pathname, excludedRoutes],
	);

	return (
		<MainStyled $navHeight={navHeight}>
			<Box className="body-wrapper">
				<Toast />
				<Box className="body-container-max-width">
					{isAuthRoute ? (
						children
					) : (
						<AdminDashboardWrapper>
							{children}
						</AdminDashboardWrapper>
					)}
				</Box>
			</Box>
		</MainStyled>
	);
}

export default memo(Main);
