"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const LoginStyled = styled(Box)`
	width: 100%;
	padding: 40px 20px;
	box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
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
				color: var(--Text-Secondary);
			}

			section {
				position: relative;

				svg {
					position: absolute;
					left: 10px;
					top: 50%;
					transform: translateY(-50%);
					color: var(--Text-Secondary);
					font-size: 15px;
				}

				input {
					width: 100%;
					padding: 10px 10px 10px 30px;
					border: 0.5px solid var(--Border-Subtle);
					border-radius: 4px;
					font-size: 14px;
					transition: border-color 0.3s;
					color: var(--Text-Primary);
					background: var(--Surface-Card);

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

		.remember-me {
			display: flex;
			align-items: center;
			gap: 5px;

			input {
				width: 16px;
				height: 16px;
			}

			label {
				font-size: 14px;
				color: var(--Text-Secondary);
				font-weight: 400;
				cursor: pointer;
			}
		}

		.forgot-password {
			font-size: 14px;
			color: var(--Primary-600);
			cursor: pointer;

			&:hover {
				text-decoration: underline;
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
			color: var(--Text-Secondary);
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

	.privacy-wrapper {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 10px;
		font-size: 12px;
		color: var(--Text-Secondary);

		.privacy-terms {
			display: flex;
			justify-content: center;
			align-items: center;
			gap: 5px;

			p {
				font-weight: 400;
			}

			a {
				font-weight: 500;

				&:hover {
					text-decoration: underline;
				}
			}
		}

		.ssl-secure {
			display: flex;
			align-items: center;
			gap: 2.5px;

			svg {
				font-size: 16px;
			}

			p {
				font-weight: 400;
				font-size: 12px;
			}
		}
	}

	@media (max-width: 767px) {
		padding: 20px;
	}
`;
