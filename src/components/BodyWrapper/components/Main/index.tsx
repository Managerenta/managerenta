"use client";
import { memo, type ReactNode, useContext } from "react";
import Box from "@/components/Box";
import { AppContextProvider } from "@/hooks";
import { Toast } from "@/layouts";
import { MainStyled } from "./styled";

interface IProps {
	children: ReactNode;
}

/**
 * Global page frame shared by every route. The dashboard shell (sidebar/navbar)
 * is NOT decided here anymore — it is applied structurally by `app/(app)/layout.tsx`,
 * while `app/(auth)/layout.tsx` renders shell-less public pages. Auth redirects
 * are enforced server-side in `middleware.ts`, so no client-side route guessing
 * remains in this component.
 */
function Main({ children }: IProps) {
	const { navHeight } = useContext(AppContextProvider);

	return (
		<MainStyled $navHeight={navHeight}>
			<Toast>
				<Box className="body-wrapper">
					<Box className="body-container-max-width">{children}</Box>
				</Box>
			</Toast>
		</MainStyled>
	);
}

export default memo(Main);
