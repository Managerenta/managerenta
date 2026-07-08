"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PreferencesStyled = styled(Box)`
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

	.preferences-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 40px;

		.left-prefs,
		.right-prefs {
			display: flex;
			flex-direction: column;
			gap: 16px;
		}

		.form-field {
			display: flex;
			flex-direction: column;
			gap: 8px;

			.field-label {
				font-size: 13px;
				font-weight: 600;
				color: #64748b;
			}

			.radio-group {
				display: flex;
				flex-direction: column;
				gap: 10px;
				margin-top: 4px;

				.radio-item {
					display: flex;
					align-items: center;
					gap: 10px;
					cursor: pointer;

					.radio-circle {
						width: 18px;
						height: 18px;
						border-radius: 50%;
						border: 2px solid #cbd5e1;
						display: flex;
						align-items: center;
						justify-content: center;
						transition: border-color 0.2s;

						.radio-dot {
							width: 10px;
							height: 10px;
							border-radius: 50%;
							background: var(--Main-Blue);
						}

						&.active {
							border-color: var(--Main-Blue);
						}
					}

					.radio-label {
						font-size: 14px;
						color: var(--Black);
					}
				}
			}
		}
	}

	/* Single column once the sidebar narrows the content area (<=1024px). */
	@media (max-width: 1024px) {
		.preferences-grid {
			grid-template-columns: 1fr;
			gap: 24px;
		}
	}

	@media (max-width: 767px) {
		padding: 16px;

		.preferences-grid {
			gap: 16px;
		}
	}
`;
