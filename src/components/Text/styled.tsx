"use client";
import styled, { css } from "styled-components";
import type { TypographySize } from "./types";

const TextStyled = styled.p<{
	$size?: TypographySize;
	$color?: string;
	$thin?: boolean;
	$bold?: boolean;
	$veryBold?: boolean;
	$underline?: boolean;
}>`
	color: inherit;

	${(props) => {
		switch (props.$size) {
			case "ss":
				return css`
					font-size: 12px;
					line-height: 24px;
				`;
			case "s":
				return css`
					font-size: 14px;
					line-height: 24px;
				`;
			case "m":
				return css`
					font-size: 16px;
					line-height: 24px;
				`;
			case "l":
				return css`
					font-size: 18px;
					line-height: 28px;
				`;
			case "xl":
				return css`
					font-size: 32px;
					line-height: 36px;
				`;
			case "xxl":
				return css`
					font-size: 42px;
					line-height: 36px;
				`;
			default:
				return css`
					font-size: 16px;
					line-height: 24px;
				`;
		}
	}}

	${(props) =>
		props.$color &&
		css`
			color: ${props.$color};
		`};

	${(props) =>
		props.$thin &&
		css`
			font-weight: 300;
		`}

	${(props) =>
		props.$bold &&
		css`
			font-weight: 600;
		`}

    ${(props) =>
		props.$veryBold &&
		css`
			font-weight: 700;
		`}

    ${(props) =>
		props.$underline &&
		css`
			text-decoration: underline;
		`}
`;

export { TextStyled };
