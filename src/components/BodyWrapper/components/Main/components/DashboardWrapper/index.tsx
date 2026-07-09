"use client";
import { useRouter } from "next/navigation";
import { memo, type ReactNode, useContext, useEffect } from "react";
import { Box } from "@/components";
import { AppContextProvider } from "@/hooks";
import { useWhoami } from "@/hooks/Admin";
import { Navbar } from "@/layouts";
import { TabSidebar, TabSidebarMobile } from "./components";
import { DashboardWrapperStyled } from "./styled";

interface IProps {
	children: ReactNode;
}

function DashboardWrapper({ children }: IProps) {
	const { navHeight } = useContext(AppContextProvider);
	const router = useRouter();
	const { operator } = useWhoami();

	// Platform operators are confined to the operator console and never see the
	// landlord app (dashboard, properties, tenants, …). Bounce them to /admin.
	// Non-operators render the app immediately; only a confirmed operator is
	// held back, so there's no flash of a loader for ordinary users.
	useEffect(() => {
		if (operator) router.replace("/admin");
	}, [operator, router]);

	if (operator) return null;

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
