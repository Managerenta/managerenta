import styled, { css } from "styled-components";

export type ButtonVariant =
	| "primary"
	| "secondary"
	| "ghost"
	| "soft"
	| "danger"
	| "danger-soft";

export type ButtonSize = "sm" | "md" | "lg";

const variantStyles = (variant: ButtonVariant) => {
	switch (variant) {
		case "secondary":
			return css`
				background: var(--mr-color-card);
				color: var(--mr-color-text);
				border: 1px solid var(--mr-color-border-strong);
				&:hover:not(:disabled) {
					background: var(--mr-color-muted);
					border-color: var(--mr-color-text-muted);
				}
				&:active:not(:disabled) {
					background: var(--mr-color-subtle);
				}
			`;
		case "ghost":
			return css`
				background: transparent;
				color: var(--mr-color-text);
				border: 1px solid transparent;
				&:hover:not(:disabled) {
					background: var(--mr-color-muted);
				}
				&:active:not(:disabled) {
					background: var(--mr-color-subtle);
				}
			`;
		case "soft":
			return css`
				background: var(--mr-color-brand-soft);
				color: var(--mr-color-brand);
				border: 1px solid transparent;
				&:hover:not(:disabled) {
					background: var(--mr-color-brand);
					color: var(--mr-color-text-on-brand);
				}
			`;
		case "danger":
			return css`
				background: var(--mr-color-danger);
				color: var(--mr-color-danger-on);
				border: 1px solid transparent;
				&:hover:not(:disabled) {
					filter: brightness(1.08);
				}
				&:active:not(:disabled) {
					filter: brightness(0.94);
				}
			`;
		case "danger-soft":
			return css`
				background: var(--mr-color-danger-soft);
				color: var(--mr-color-danger);
				border: 1px solid transparent;
				&:hover:not(:disabled) {
					background: var(--mr-color-danger);
					color: var(--mr-color-danger-on);
				}
			`;
		default:
			return css`
				background: var(--mr-color-brand);
				color: var(--mr-color-text-on-brand);
				border: 1px solid var(--mr-color-brand);
				&:hover:not(:disabled) {
					background: var(--mr-color-brand-hover);
					border-color: var(--mr-color-brand-hover);
				}
				&:active:not(:disabled) {
					background: var(--mr-color-brand-active);
					border-color: var(--mr-color-brand-active);
				}
			`;
	}
};

const sizeStyles = (size: ButtonSize) => {
	switch (size) {
		case "sm":
			return css`
				height: 34px;
				padding: 0 12px;
				font-size: var(--mr-fs-sm);
				border-radius: var(--mr-radius-sm);
			`;
		case "lg":
			return css`
				height: 48px;
				padding: 0 20px;
				font-size: var(--mr-fs-base);
				border-radius: var(--mr-radius-md);
			`;
		default:
			return css`
				height: 40px;
				padding: 0 16px;
				font-size: var(--mr-fs-md);
				border-radius: var(--mr-radius-sm);
			`;
	}
};

/*
 * Legacy callers (pre-token system) pass background/color/border directly and
 * expect *no* variant defaults — they're styling the button manually via the
 * parent's CSS class (e.g. background="inherit" + color via parent stylesheet).
 * Detect that mode here and apply only the layout/interaction baseline.
 */
const legacyBase = css`
	height: 44px;
	padding: 0 16px;
	border-radius: var(--mr-radius-sm);
	font-size: var(--mr-fs-md);
	background: inherit;
	color: inherit;
	border: 1px solid transparent;
`;

export const ButtonStyled = styled.button<{
	$width?: string;
	$height?: string;
	$borderRadius?: string;
	$background?: string;
	$border?: string;
	$color?: string;
	$variant?: ButtonVariant;
	$size?: ButtonSize;
	$fullWidth?: boolean;
}>`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	font-family: inherit;
	font-weight: var(--mr-fw-semibold);
	letter-spacing: -0.005em;
	line-height: 1;
	white-space: nowrap;
	cursor: pointer;
	user-select: none;
	transition:
		background var(--mr-dur-fast) var(--mr-ease-out),
		color var(--mr-dur-fast) var(--mr-ease-out),
		border-color var(--mr-dur-fast) var(--mr-ease-out),
		box-shadow var(--mr-dur-fast) var(--mr-ease-out),
		transform var(--mr-dur-fast) var(--mr-ease-out);

	${(p) => {
		const isLegacy =
			!p.$variant &&
			(p.$background != null || p.$color != null || p.$border != null);
		if (isLegacy) return legacyBase;
		return css`
			${sizeStyles(p.$size ?? "md")}
			${variantStyles(p.$variant ?? "primary")}
		`;
	}}

	width: ${({ $width, $fullWidth }) =>
		$fullWidth ? "100%" : ($width ?? "auto")};

	/* Explicit per-prop overrides — legacy API */
	${({ $background }) =>
		$background != null &&
		css`
			background: ${$background};
		`}
	${({ $color }) =>
		$color != null &&
		css`
			color: ${$color};
		`}
	${({ $border }) =>
		$border != null &&
		css`
			border: ${$border};
		`}
	${({ $height }) =>
		$height != null &&
		css`
			height: ${$height};
		`}
	${({ $borderRadius }) =>
		$borderRadius != null &&
		css`
			border-radius: ${$borderRadius};
		`}

	&:focus-visible {
		outline: none;
		box-shadow: var(--mr-shadow-focus);
	}

	&:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	&:active:not(:disabled) {
		transform: translateY(0.5px);
	}
`;
