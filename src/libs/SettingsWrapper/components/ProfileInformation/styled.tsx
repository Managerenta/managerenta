"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const ProfileInformationStyled = styled(Box)`
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

	.profile-content {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 40px;
		align-items: flex-start;

		.avatar-section {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 12px;

			.avatar-wrapper {
				position: relative;
				width: 120px;
				height: 120px;
				border-radius: 50%;
				cursor: pointer;
				overflow: hidden;
				border: 4px solid #e2e8f0;
				background: linear-gradient(135deg, #94a3b8, #cbd5e1);

				img {
					width: 100% !important;
					height: 100% !important;
					object-fit: cover;
				}

				.avatar-placeholder {
					width: 100%;
					height: 100%;
					background: linear-gradient(135deg, #94a3b8, #cbd5e1);
				}

				.avatar-overlay {
					position: absolute;
					inset: 0;
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					gap: 4px;
					background: rgba(0, 0, 0, 0.5);
					color: white;
					font-size: 12px;
					font-weight: 600;
					opacity: 0;
					transition: opacity 0.2s ease;
				}

				&:hover .avatar-overlay {
					opacity: 1;
				}
			}
		}

		.form-fields {
			display: flex;
			flex-direction: column;
			gap: 16px;

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

				.phone-input-wrap {
					.PhoneInput {
						display: flex;
						align-items: center;
						gap: 8px;
						padding: 4px 14px;
						border: 1px solid var(--Border-Subtle);
						border-radius: 8px;
						background: var(--Surface-Page);

						&--focus {
							border-color: var(--Main-Blue);
							background: var(--Surface-Card);
						}

						.PhoneInputCountry {
							display: flex;
							align-items: center;
							gap: 6px;
						}

						.PhoneInputCountryIcon {
							width: 24px;
							height: 18px;
							box-shadow: none;
							background: transparent;
						}

						.PhoneInputCountrySelectArrow {
							color: #64748b;
							opacity: 1;
						}

						.PhoneInputInput {
							flex: 1;
							padding: 8px 0;
							border: none;
							background: transparent;
							font-size: 14px;
							color: var(--Black);
							outline: none;
						}
					}
				}

				.input-with-icon {
					position: relative;

					input {
						width: 100%;
						padding-right: 40px;
					}

					.verified-icon {
						position: absolute;
						right: 12px;
						top: 50%;
						transform: translateY(-50%);
						width: 22px;
						height: 22px;
						border-radius: 50%;
						background: #22c55e;
						color: white;
						font-size: 12px;
						display: flex;
						align-items: center;
						justify-content: center;
					}
				}
			}

			.form-actions {
				display: flex;
				gap: 12px;
				margin-top: 8px;

				.save-btn,
				.cancel-btn {
					button {
						padding: 10px 24px;
						font-size: 14px;
						font-weight: 500;
						cursor: pointer;
						white-space: nowrap;
					}
				}

				.cancel-btn button {
					border: none;
					color: #64748b;

					&:hover {
						color: var(--Black);
					}
				}
			}
		}
	}

	@media (max-width: 767px) {
		padding: 16px;

		.profile-content {
			grid-template-columns: 1fr;
			gap: 20px;

			.avatar-section {
				.avatar-wrapper {
					width: 90px;
					height: 90px;
				}
			}

			.form-actions {
				flex-direction: column;

				.save-btn,
				.cancel-btn {
					button {
						width: 100%;
					}
				}
			}
		}
	}
`;
