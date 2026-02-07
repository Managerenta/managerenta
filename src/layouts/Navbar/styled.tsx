"use client";

import styled from "styled-components";
import { Box } from "@/components";

export const NavbarStyled = styled(Box)<{
	$navHeight: string;
	$background: string;
}>`
	width: 100%;
	height: ${({ $navHeight }) => $navHeight};
	background: ${({ $background }) => $background};
`;
