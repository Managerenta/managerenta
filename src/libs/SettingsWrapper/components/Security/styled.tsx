"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const SecurityStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 20px;
	border: 1px solid var(--Border-Subtle);
	display: flex;
	flex-direction: column;
	gap: 20px;

	.section-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--Black);
	}

	.sub-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--Black);
		margin-bottom: 4px;
	}

	.security-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 40px;
	}

	.password-section {
		display: flex;
		flex-direction: column;
		gap: 14px;

		.form-field {
			display: flex;
			flex-direction: column;
			gap: 6px;

			.field-label {
				font-size: 13px;
				font-weight: 600;
				color: #64748b;
			}

			input {
				padding: 10px 14px;
				border: 1px solid var(--Border-Subtle);
				border-radius: 8px;
				font-size: 14px;
				color: var(--Black);
				background: var(--Surface-Page);

				&:focus {
					outline: none;
					border-color: var(--Main-Blue);
					background: var(--Surface-Card);
				}
			}

			.strength-bars {
				display: flex;
				gap: 4px;

				.strength-bar {
					flex: 1;
					height: 4px;
					border-radius: 2px;
					transition: background 0.3s;
				}
			}

			.strength-label {
				font-size: 12px;
				font-weight: 600;
			}
		}

		.update-btn {
			margin-top: 4px;

			button {
				padding: 10px 24px;
				font-size: 14px;
				font-weight: 500;
			}
		}
	}

	.twofa-section {
		display: flex;
		flex-direction: column;
		gap: 16px;

		.twofa-toggle {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 14px;
			background: var(--Surface-Page);
			border-radius: 10px;

			.toggle-info {
				display: flex;
				flex-direction: column;
				gap: 2px;

				.toggle-label {
					font-size: 14px;
					font-weight: 600;
					color: var(--Black);
				}

				.toggle-desc {
					font-size: 12px;
					color: #94a3b8;
				}
			}

			.toggle-switch {
				width: 44px;
				height: 24px;
				border-radius: 12px;
				background: #e2e8f0;
				cursor: pointer;
				position: relative;
				transition: background 0.2s;

				.toggle-thumb {
					width: 20px;
					height: 20px;
					border-radius: 50%;
					background: var(--Surface-Card);
					position: absolute;
					top: 2px;
					left: 2px;
					transition: transform 0.2s;
					box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
				}

				&.active {
					background: var(--Main-Blue);

					.toggle-thumb {
						transform: translateX(20px);
					}
				}
			}
		}

		.setup-btn button {
			padding: 8px 20px;
			font-size: 13px;
			font-weight: 500;
			border: 1px solid var(--Border-Subtle);
		}
	}

	@media (max-width: 767px) {
		padding: 16px;

		.security-grid {
			grid-template-columns: 1fr;
			gap: 24px;
		}

		.password-section .update-btn button {
			width: 100%;
		}
	}
`;
