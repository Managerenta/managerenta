"use client";

import styled from "styled-components";
import { Box } from "@/components";

export const ModalWrapperStyled = styled(Box)<{
	$background?: string;
}>`
	display: grid;
	place-items: center;
	border-radius: inherit;

	.wrapper {
		position: relative;
		width: 650px;
		min-height: 550px;
		max-height: 650px;
		height: auto;
		border-radius: inherit;
		/* background: ${({ $background }) =>
			$background || "var(--Secondary-800)"}; */
		display: flex;
		flex-direction: column;
		gap: 20px 0;
		padding: 10px;
		overflow-y: scroll;
		border: unset;

		.close {
			position: absolute;
			top: 15px;
			right: 15px;
			cursor: pointer;
		}
	}

	@media (max-width: 700px) {
		display: grid;
		place-items: center;
		border-radius: inherit;
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		max-width: unset;
		max-height: unset;
		z-index: 999;
		background: var(--Secondary-800);

		.wrapper {
			width: 100vw;
			height: 100vh;
			min-height: 100vh;
			max-height: 100vh;
			border-radius: unset;
			padding-bottom: 100px;
		}

		@media (max-width: 600px) {
			.wrapper {
				.close {
					position: absolute;
					top: 12.5px;
					right: 12.5px;
					cursor: pointer;
				}
			}
		}
	}
`;
