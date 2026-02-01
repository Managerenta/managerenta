"use client";
import styled from "styled-components";
import { Box } from "../../../../components";

export const ModalStyled = styled(Box)<{
	$background?: string;
	$color?: string;
	$navHeight: string;
	$open: boolean;
	$border?: string;
}>`
	background: transparent;
	color: ${({ $color }) => $color ?? "unset"};
	width: 100%;
	height: auto;
	min-height: 100vh;
	position: fixed;
	top: ${({ $navHeight }) => $navHeight};
	left: 0;
	right: 0;
	z-index: ${({ $zIndex }) => $zIndex || 2};
	visibility: ${({ $open }) => ($open ? "visible" : "hidden")};

	.container {
		display: grid;
		place-content: center;
		width: 100%;
		height: calc(100vh - ${({ $navHeight }) => $navHeight});
		margin: auto;
		.wrapper {
			.item {
				background: ${({ $background }) => $background ?? "unset"};
				position: relative;
				width: auto;
				/* max-width: 300px; */
				height: auto;
				margin: auto;
				border-radius: 12px;
				display: flex;
				justify-content: center;
				/* border: ${({ $border }) => $border || "1px solid var(--dark-15)"}; */
			}
		}
	}
`;
