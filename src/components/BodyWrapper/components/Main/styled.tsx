"use client";
import styled from "styled-components";
import Box from "@/components/Box";

export const MainStyled = styled(Box)<{
	$color?: string;
	$background?: string;
	$navHeight: string;
}>`
	width: 100%;
	height: auto;

	.body-wrapper {
		height: auto;
		min-height: 100vh;
		color: ${(props) => props.$color || "var(--White)"};
		background: ${({ $background }) => $background || "var(--dark)"};

		.body-container-max-width {
			width: 100%;
			height: 100%;
			/* max-width: 2560px; */
			margin: 0 auto;
			min-height: calc(100vh - ${({ $navHeight }) => $navHeight});
		}
	}
`;
