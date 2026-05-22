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
	font-family: var(--mr-font-sans);

	.body-wrapper {
		height: auto;
		min-height: 100vh;
		color: ${(props) => props.$color || "var(--mr-color-text)"};
		background: ${({ $background }) =>
			$background || "var(--mr-color-page)"};

		.body-container-max-width {
			width: 100%;
			height: 100%;
			margin: 0 auto;
			min-height: calc(100vh - ${({ $navHeight }) => $navHeight});
		}
	}
`;
