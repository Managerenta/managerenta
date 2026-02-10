"use client";
import { memo } from "react";
import { Box } from "@/components";
import { KeyHighlights, Login, Signup } from "./components";
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
				<Box className="main">
					{type === "login" ? <Login /> : <Signup />}
				</Box>
			</Box>
		</UserAuthWrapperStyled>
	);
}

export default memo(UserAuthWrapper);
