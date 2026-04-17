"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TenantDetailHeaderStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 20px;

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		flex-wrap: wrap;

		a {
			color: #3b82f6;
			text-decoration: none;
			&:hover {
				text-decoration: underline;
			}
		}

		.separator {
			color: #94a3b8;
		}

		.breadcrumb-link {
			cursor: pointer;
			p {
				color: #3b82f6;
				&:hover {
					text-decoration: underline;
				}
			}
		}

		.breadcrumb-text {
			color: #64748b;
		}

		.current {
			color: #64748b;
		}
	}

	.header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;

		.tenant-info {
			display: flex;
			align-items: center;
			gap: 16px;

			.avatar-placeholder {
				width: 56px;
				height: 56px;
				border-radius: 50%;
				background: linear-gradient(135deg, #1e3a5f, #2d5a87);
				flex-shrink: 0;
				display: flex;
				align-items: center;
				justify-content: center;
				color: white;
				font-size: 18px;
				font-weight: 700;
			}

			.info-text {
				display: flex;
				flex-direction: column;
				gap: 4px;

				.tenant-name {
					font-size: 24px;
					font-weight: 700;
					color: var(--Black);
				}

				.tenant-property {
					font-size: 14px;
					color: #64748b;
				}
			}
		}

		.action-buttons {
			display: flex;
			align-items: center;
			gap: 12px;

			.edit-btn,
			.send-reminder-btn {
				display: flex;
				align-items: center;
				justify-content: center;

				button {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 8px;
					padding: 8px 20px;
					border-radius: 8px;
					font-size: 14px;
					font-weight: 500;
					cursor: pointer;
					white-space: nowrap;
					transition: opacity 0.2s;

					&:hover {
						opacity: 0.9;
					}
				}
			}

			.edit-btn button {
				border: 1px solid var(--Border-Subtle);
			}
		}
	}

	@media (max-width: 767px) {
		gap: 16px;

		.breadcrumb {
			display: none;
		}

		.header-row {
			flex-direction: column;
			align-items: center;
			text-align: center;
			background: var(--Surface-Card);
			border-radius: 12px;
			padding: 20px;
			border: 1px solid var(--Border-Subtle);

			.tenant-info {
				flex-direction: column;
				align-items: center;
				gap: 12px;

				.avatar-placeholder {
					width: 64px;
					height: 64px;
					font-size: 22px;
				}

				.info-text {
					align-items: center;

					.tenant-name {
						font-size: 20px;
					}

					.tenant-property {
						font-size: 13px;
						text-align: center;
					}
				}
			}

			.action-buttons {
				display: none;
			}
		}
	}
`;
