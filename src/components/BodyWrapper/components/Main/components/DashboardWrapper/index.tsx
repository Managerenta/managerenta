"use client";
import { memo, type ReactNode, useContext } from "react";
import { Box } from "@/components";
import { AppContextProvider } from "@/hooks";
import { Navbar } from "@/layouts";
import { TabSidebar, TabSidebarMobile } from "./components";
import { DashboardWrapperStyled } from "./styled";

interface IProps {
	children: ReactNode;
}

function DashboardWrapper({ children }: IProps) {
	const { navHeight } = useContext(AppContextProvider);

	return (
		<DashboardWrapperStyled $navHeight={navHeight}>
			<Box className="sidebar">
				<TabSidebar />
			</Box>

			<Box className="right-section">
				<Navbar
					navHeight={navHeight}
					background="var(--Main-White, #fff)"
				/>
				<Box className="main-content">{children}</Box>
			</Box>

			<TabSidebarMobile />
		</DashboardWrapperStyled>
	);
}

export default memo(DashboardWrapper);
