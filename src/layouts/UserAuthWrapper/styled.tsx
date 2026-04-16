"use client";

import styled from "styled-components";
import { Box } from "@/components";

export const UserAuthWrapperStyled = styled(Box)`
	width: 100%;
	height: 100%;

	.wrapper {
		width: 100%;
		height: 100%;
		min-height: 100vh;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		background: var(--Auth-Panel-Bg);

		.details,
		.main {
			width: 100%;
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20px;

			* {
				max-width: 500px;
			}
		}

		/* .details {
		} */

		.main {
			background: var(--Main-White);
			color: var(--Black);
		}
	}
	@media (max-width: 767px) {
		.wrapper {
			grid-template-columns: 1fr;

			.details,
			.main {
				* {
					max-width: unset;
				}
			}
		}
	}
`;
