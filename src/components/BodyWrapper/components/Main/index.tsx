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
	const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);

	const { navHeight, isUserLoggedIn } = useContext(AppContextProvider);
	const pathname = usePathname();
	const router = useRouter();

	const isAuthRoute = useMemo(
		() => excludedRoutes.includes(pathname),
		[pathname, excludedRoutes],
	);

	console.log("-".repeat(50));
	console.log("isAuthRoute", isAuthRoute);
	console.log("isUserLoggedIn", isUserLoggedIn);
	console.log("isAuthCheckComplete", isAuthCheckComplete);
	console.log("-".repeat(50));

	// Mark auth check as complete after initial load
	useEffect(() => {
		setIsAuthCheckComplete(true);
	}, []);

	// Redirect logged-in users away from auth routes
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
