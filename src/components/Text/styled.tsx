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
	font-family: inherit;
	margin: 0;

	${(props) => {
		switch (props.$size) {
			case "ss":
				return css`
					font-size: var(--mr-fs-xs);
					line-height: var(--mr-lh-snug);
					letter-spacing: 0.005em;
				`;
			case "s":
				return css`
					font-size: var(--mr-fs-md);
					line-height: var(--mr-lh-normal);
				`;
			case "m":
				return css`
					font-size: var(--mr-fs-base);
					line-height: var(--mr-lh-normal);
				`;
			case "l":
				return css`
					font-size: var(--mr-fs-lg);
					line-height: var(--mr-lh-snug);
					letter-spacing: -0.005em;
				`;
			case "xl":
				return css`
					font-size: var(--mr-fs-2xl);
					line-height: var(--mr-lh-tight);
					letter-spacing: -0.015em;
					font-weight: var(--mr-fw-semibold);
				`;
			case "xxl":
				return css`
					font-size: var(--mr-fs-4xl);
					line-height: var(--mr-lh-tight);
					letter-spacing: -0.02em;
					font-weight: var(--mr-fw-bold);
				`;
			default:
				return css`
					font-size: var(--mr-fs-base);
					line-height: var(--mr-lh-normal);
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
			font-weight: var(--mr-fw-regular);
		`}

	${(props) =>
		props.$bold &&
		css`
			font-weight: var(--mr-fw-semibold);
		`}

	${(props) =>
		props.$veryBold &&
		css`
			font-weight: var(--mr-fw-bold);
		`}

	${(props) =>
		props.$underline &&
		css`
			text-decoration: underline;
			text-underline-offset: 2px;
		`}
`;

export { TextStyled };
