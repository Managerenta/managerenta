"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TransactionFormStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 20px;
	border: 1px solid var(--Border-Subtle);
	display: flex;
	flex-direction: column;
	gap: 20px;

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 12px;

		.section-label {
			font-size: 15px;
			font-weight: 700;
			color: var(--Black);
		}

		.type-grid {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 12px;

			.type-card {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 8px;
				padding: 16px 12px;
				border: 1.5px solid var(--Border-Subtle);
				border-radius: 10px;
				cursor: pointer;
				transition: all 0.2s;

				.type-icon {
					color: var(--Text-Secondary);
				}

				.type-label {
					font-size: 13px;
					font-weight: 500;
					color: var(--Text-Secondary);
					text-align: center;
				}

				&:hover {
					border-color: #94a3b8;
				}

				&.active {
					border-color: var(--Main-Blue);
					background: rgba(47, 128, 237, 0.08);

					.type-icon {
						color: var(--Main-Blue);
					}

					.type-label {
						color: var(--Main-Blue);
						font-weight: 600;
					}
				}
			}
		}
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;

		&.single {
			grid-template-columns: 1fr;
		}

		.form-field {
			display: flex;
			flex-direction: column;
			gap: 5px;

			&.half {
				max-width: 50%;
			}

			.field-label {
				font-size: 13px;
				font-weight: 600;
				color: var(--Text-Secondary);
			}

			.amount-input {
				display: flex;
				align-items: center;
				border: 1px solid var(--Border-Subtle);
				border-radius: 8px;
				overflow: hidden;

				.currency-prefix {
					padding: 10px 14px;
					background: var(--Surface-Page);
					font-size: 14px;
					font-weight: 600;
					color: var(--Black);
					border-right: 1px solid var(--Border-Subtle);
				}

				input {
					flex: 1;
					padding: 10px 14px;
					border: none;
					font-size: 14px;
					color: var(--Black);
					outline: none;

					&::placeholder {
						color: #94a3b8;
					}
				}
			}

			input[type="date"],
			input[type="text"] {
				padding: 10px 14px;
				border: 1px solid var(--Border-Subtle);
				border-radius: 8px;
				font-size: 14px;
				color: var(--Black);

				&::placeholder {
					color: #94a3b8;
				}
			}

			.notes-textarea {
				padding: 10px 14px;
				border: 1px solid var(--Border-Subtle);
				border-radius: 8px;
				font-size: 14px;
				color: var(--Black);
				resize: vertical;
				min-height: 100px;
				font-family: inherit;

				&::placeholder {
					color: #94a3b8;
				}
			}

			.method-select {
				padding: 10px 14px;
				border: 1px solid var(--Border-Subtle);
				border-radius: 8px;
				font-size: 14px;
				color: var(--Black);
				background: var(--Surface-Card);
				cursor: pointer;
			}

			.upload-zone {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 8px;
				padding: 24px;
				border: 2px dashed var(--Border-Subtle);
				border-radius: 10px;
				background: var(--Surface-Muted);
				cursor: pointer;
				transition: border-color 0.2s;

				&:hover {
					border-color: #94a3b8;
				}

				svg {
					color: #94a3b8;
				}

				.upload-text {
					font-size: 13px;
					color: #64748b;
				}

				.upload-link {
					font-size: 13px;
					font-weight: 600;
					color: #3b82f6;
					cursor: pointer;

					&:hover {
						text-decoration: underline;
					}
				}

				.upload-hint {
					font-size: 12px;
					color: #94a3b8;
				}
			}
		}
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding-top: 16px;
		border-top: 1px solid var(--Border-Subtle);

		.cancel-btn,
		.save-btn {
			button {
				padding: 10px 24px;
				font-size: 14px;
				font-weight: 500;
				cursor: pointer;
				white-space: nowrap;
			}
		}

		.cancel-btn button {
			border: 1px solid var(--Border-Subtle);
		}
	}

	@media (max-width: 767px) {
		padding: 16px;
		gap: 16px;

		.form-section .type-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 8px;
		}

		.form-row {
			grid-template-columns: 1fr;
			gap: 16px;

			.form-field.half {
				max-width: 100%;
			}
		}

		.form-actions {
			flex-direction: column-reverse;

			.cancel-btn,
			.save-btn {
				button {
					width: 100%;
				}
			}
		}
	}
`;
