"use client";
import { memo } from "react";
import { NavbarStyled } from "./styled";

interface IProps {
	navHeight: string;
	background: string;
}

function Navbar({ background, navHeight }: IProps) {
	return (
		<NavbarStyled $navHeight={navHeight} $background={background}>
			Navbar
		</NavbarStyled>
	);
}

export default memo(Navbar);
