"use client";
import { memo } from "react";
import { Box } from "@/components";
import { KeyHighlights, Login } from "./components";
import { UserAuthWrapperStyled } from "./styled";

interface IProps {
	type: "login" | "signup";
}

function UserAuthWrapper({ type }: IProps) {
	return (
		<UserAuthWrapperStyled>
			<Box className="wrapper">
				<Box className="details">
					<KeyHighlights />
				</Box>
				<Box className="main">{type === "login" ? <Login /> : <Login />}</Box>
			</Box>
		</UserAuthWrapperStyled>
	);
}

export default memo(UserAuthWrapper);
