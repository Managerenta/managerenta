"use client";
import styled from "styled-components";
import { Box } from "../../../../components";

// fr-toolbar
export const FroalaEditorStyled = styled(Box)<{
	$isReadOnly: boolean;
	$height?: string;
	$background?: string;
	$color?: string;
}>`
	/* .fr-box.fr-basic.fr-top {
	} */

	.fr-toolbar,
	.fr-second-toolbar {
		display: ${({ $isReadOnly }) => ($isReadOnly ? "none" : "inherit")};
	}

	.fr-toolbar {
		position: unset;
	}

	.fr-box.fr-basic.fr-top .fr-wrapper {
		height: 100%;
		min-height: ${({ $isReadOnly, $height }) =>
			$isReadOnly === false && $height ? $height : "100%"};
		background: ${({ $background }) => ($background ? $background : "inherit")};

		* {
			color: ${({ $color }) => $color || "inherit"};
		}
	}

	.fr-no-border {
		border-collapse: collapse;
		margin: auto;

		td {
			border: none;
		}
	}

	.fr-text-beautify {
		padding: 15px;
		background: var(--dark-10);
		color: hsla(0, 0%, 100%, 0.8);
		border-radius: 12px;
	}

	.fr-background-green {
		background: green;
	}

	.fr-full-width {
		width: 100%;
	}

	.fr-full-height {
		height: 100%;
	}

	.fr-full-width-height {
		width: 100%;
		height: auto;
		aspect-ratio: 1;
	}

	.fr-aspect-ratio {
		aspect-ratio: 1;
	}
`;
