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
	const [isAuthCheckComplete, _setIsAuthCheckComplete] = useState(false);

	const { navHeight, isUserLoggedIn } = useContext(AppContextProvider);
	const pathname = usePathname();
	const router = useRouter();

	const isAuthRoute = useMemo(
		() =>
			excludedRoutes.includes(pathname) || pathname.startsWith("/portal"),
		[pathname, excludedRoutes],
	);

	const isAdminRoute = pathname.startsWith("/admin");

	useEffect(() => {
		if (isUserLoggedIn && isAuthRoute) {
			console.log("User is logged in, redirecting to dashboard...");
			router.push("/dashboard");
		}
	}, [isUserLoggedIn, isAuthRoute, router]);

	// Redirect non-logged-in users away from protected routes
	useEffect(() => {
		if (isAuthCheckComplete && !isUserLoggedIn && !isAuthRoute) {
			console.log("User is not logged in, redirecting to login...");
			router.push("/login");
		}
	}, [isAuthCheckComplete, isUserLoggedIn, isAuthRoute, router]);

	return (
		<MainStyled $navHeight={navHeight}>
			<Toast>
				<Box className="body-wrapper">
					<Box className="body-container-max-width">
						{isAuthRoute ? (
							children
						) : isAdminRoute ? (
							children
						) : (
							<DashboardWrapper>{children}</DashboardWrapper>
						)}
					</Box>
				</Box>
			</Toast>
		</MainStyled>
	);
}

export default memo(Main);
