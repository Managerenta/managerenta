"use client";
import { usePathname, useRouter } from "next/navigation";
import {
	memo,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import Box from "@/components/Box";
import { AppContextProvider } from "@/hooks";
import { Toast } from "@/layouts";
import { DashboardWrapper } from "./components";
import { MainStyled } from "./styled";

interface IProps {
	children: ReactNode;
}

function Main({ children }: IProps) {
	const [excludedRoutes] = useState(["/login", "/signup", "/"]);

	const { navHeight, isUserLoggedIn } = useContext(AppContextProvider);
	const pathname = usePathname();
	const router = useRouter();

	const isAuthRoute = useMemo(
		() => excludedRoutes.includes(pathname),
		[pathname, excludedRoutes],
	);

	useEffect(() => {
		if (isUserLoggedIn && isAuthRoute) {
			console.log("Rerouting...");
			router.push("/dashboard");
		}
	}, [isUserLoggedIn, router, isAuthRoute]);

	return (
		<MainStyled $navHeight={navHeight}>
			<Box className="body-wrapper">
				<Toast />
				<Box className="body-container-max-width">
					{isAuthRoute && !isUserLoggedIn ? (
						children
					) : (
						<DashboardWrapper>{children}</DashboardWrapper>
					)}
				</Box>
			</Box>
		</MainStyled>
	);
}

export default memo(Main);
