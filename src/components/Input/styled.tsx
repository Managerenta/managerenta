"use client";
import styled, { css } from "styled-components";

export const InputStyled = styled.input<{
	$h?: string;
	$border?: string;
	$borderR?: string;
	$padding?: string;
}>`
	color: inherit;
	background: var(--mr-color-card);
	padding: ${({ $padding }) => $padding ?? "0 12px"};
	width: 100%;
	height: 40px;
	font-family: inherit;
	font-size: var(--mr-fs-md);
	line-height: 1;
	color: var(--mr-color-text);
	border: ${({ $border }) => $border ?? "1px solid var(--mr-color-border)"};
	border-radius: var(--mr-radius-sm);
	transition:
		border-color var(--mr-dur-fast) var(--mr-ease-out),
		box-shadow var(--mr-dur-fast) var(--mr-ease-out),
		background var(--mr-dur-fast) var(--mr-ease-out);

	&::placeholder {
		color: var(--mr-color-text-subtle);
	}

	&:hover {
		border-color: ${({ $border }) =>
			$border ?? "var(--mr-color-border-strong)"};
	}

	&:focus,
	&:focus-visible {
		outline: none;
		border-color: var(--mr-color-brand);
		box-shadow: var(--mr-shadow-focus);
	}

	&:disabled {
		background: var(--mr-color-muted);
		color: var(--mr-color-text-subtle);
		cursor: not-allowed;
	}

	${({ $h }) =>
		$h &&
		css`
			height: ${$h};
		`}

	${({ $borderR }) =>
		$borderR &&
		css`
			border-radius: ${$borderR};
		`}
`;
