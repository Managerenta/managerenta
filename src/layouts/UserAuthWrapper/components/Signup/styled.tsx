"use client";

import styled from "styled-components";
import { Box } from "@/components";

export const SignupStyled = styled(Box)`
	width: 100%;
	border-radius: 6px;
	display: flex;
	flex-direction: column;
	gap: 15px;

	form {
		display: flex;
		flex-direction: column;
		gap: 15px;

		.form-field {
			display: flex;
			flex-direction: column;
			gap: 5px;

			label {
				display: block;
				font-size: 14px;
				font-weight: 400;
				color: var(--Secondary-100);
			}

			section {
				position: relative;

				svg {
					position: absolute;
					left: 10px;
					top: 50%;
					transform: translateY(-50%);
					color: var(--Secondary-100);
					font-size: 14px;
				}

				input {
					width: 100%;
					padding: 10px 10px 10px 30px;
					border: 0.5px solid grey;
					border-radius: 4px;
					font-size: 14px;
					transition: border-color 0.3s;
					color: var(--Secondary-100);

					/* &:focus {
				border-color: var(--Primary-600);
			} */
				}
			}
		}
	}

	.options {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 10px;

		.privacy-terms {
			display: flex;
			align-items: center;
			gap: 5px;

			input {
				width: 16px;
				height: 16px;
			}

			label {
				font-size: 14px;
				color: var(--Secondary-100);
				font-weight: 400;
				cursor: pointer;
			}

			a {
				font-weight: 500;

				&:hover {
					text-decoration: underline;
				}
			}
		}
	}

	button {
		height: 51px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		color: var(--White);
		border: none;
		cursor: pointer;
		transition: background-color 0.3s;
		background: var(--Main-Blue);
	}

	.register {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 5px;
		font-size: 16px;

		p {
			color: var(--Secondary-100);
			font-weight: 400;
		}

		a {
			color: var(--Main-Blue);
			font-weight: 500;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	@media (max-width: 767px) {
		padding: 20px;
	}
`;
