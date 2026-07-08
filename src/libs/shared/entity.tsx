"use client";
import type { ReactNode } from "react";
import { FiX } from "react-icons/fi";
import styled from "styled-components";
import { Box, Text } from "@/components";

/** Outer page shell shared by the maintenance / vendors / documents / audit pages. */
export const EntityPageStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 20px;
	width: 100%;
	padding: 10px 5px 40px;
	background: var(--Surface-Page);

	.page-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 16px;
	}

	.page-head .titles .title {
		font-size: 24px;
		font-weight: 700;
		color: var(--Black);
	}
	.page-head .titles .subtitle {
		font-size: 14px;
		color: var(--Text-Secondary);
		margin-top: 4px;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 14px;
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-md);
		padding: 12px;
	}
	.toolbar .search {
		flex: 1 1 240px;
		min-width: 200px;
		height: 44px;
		padding: 0 14px;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
		background: var(--Surface-Card);
		color: var(--Text-Primary);
		font-size: 14px;
	}
	.toolbar .filter {
		width: 200px;
	}

	.panel {
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-md);
		overflow: hidden;
	}

	.empty {
		padding: 48px 20px;
		text-align: center;
		color: var(--Text-Secondary);
		font-size: 14px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}
	thead th {
		text-align: left;
		padding: 14px 16px;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--Text-Secondary);
		background: var(--Surface-Muted);
		border-bottom: 1px solid var(--Border-Subtle);
		white-space: nowrap;
	}
	tbody td {
		padding: 14px 16px;
		border-bottom: 1px solid var(--Border-Subtle);
		color: var(--Text-Primary);
		vertical-align: middle;
	}
	tbody tr:last-child td {
		border-bottom: none;
	}
	tbody tr:hover {
		background: var(--mr-color-subtle);
	}
	.row-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--mr-radius-sm);
		border: 1px solid var(--Border-Subtle);
		background: var(--Surface-Card);
		color: var(--Text-Secondary);
		cursor: pointer;
		transition: all var(--mr-dur-fast);
	}
	.icon-btn:hover {
		color: var(--Text-Primary);
		border-color: var(--mr-color-border-strong);
	}
	.icon-btn.danger:hover {
		color: var(--mr-color-brand-on);
		background: var(--mr-color-danger);
		border-color: var(--mr-color-danger);
	}

	@media (max-width: 1024px) {
		.stat-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		/* Below 1024px the desktop sidebar is still shown, so the content
		   column is narrow. Let wide data tables scroll horizontally instead
		   of being clipped by the panel's overflow:hidden. */
		.table-scroll {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}
		table {
			min-width: 640px;
		}
	}
	@media (max-width: 640px) {
		.stat-grid {
			grid-template-columns: 1fr;
		}
	}
`;

const StatCardStyled = styled(Box)`
	background: var(--Surface-Card);
	border: 1px solid var(--Border-Subtle);
	border-radius: var(--mr-radius-md);
	padding: 18px;
	box-shadow: var(--mr-shadow-sm);
	display: flex;
	flex-direction: column;
	gap: 6px;

	.stat-icon {
		width: 36px;
		height: 36px;
		border-radius: var(--mr-radius-sm);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 4px;
	}
	.stat-value {
		font-size: 26px;
		font-weight: 700;
		color: var(--Black);
		line-height: 1.1;
	}
	.stat-label {
		font-size: 13px;
		color: var(--Text-Secondary);
	}
`;

export function StatCard({
	label,
	value,
	icon,
	iconBg,
}: {
	label: string;
	value: ReactNode;
	icon?: ReactNode;
	iconBg?: string;
}) {
	return (
		<StatCardStyled>
			{icon ? (
				<Box
					className="stat-icon"
					style={{
						background: iconBg ?? "var(--mr-color-brand-soft)",
					}}
				>
					{icon}
				</Box>
			) : null}
			<Text className="stat-value">{value}</Text>
			<Text className="stat-label">{label}</Text>
		</StatCardStyled>
	);
}

export const Badge = styled.span<{ $bg?: string; $fg?: string }>`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	border-radius: var(--mr-radius-pill);
	font-size: 12px;
	font-weight: 600;
	text-transform: capitalize;
	white-space: nowrap;
	background: ${({ $bg }) => $bg ?? "var(--mr-color-subtle)"};
	color: ${({ $fg }) => $fg ?? "var(--Text-Primary)"};
`;

const ModalOverlay = styled(Box)`
	position: fixed;
	inset: 0;
	z-index: 1000;
	background: rgba(20, 23, 28, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;

	.modal {
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-lg);
		box-shadow: var(--mr-shadow-lg);
		width: 100%;
		max-width: 560px;
		max-height: 90vh;
		overflow-y: auto;
	}
	.modal-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px 22px;
		border-bottom: 1px solid var(--Border-Subtle);
		position: sticky;
		top: 0;
		background: var(--Surface-Card);
		z-index: 1;
	}
	.modal-head .modal-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--Black);
	}
	.modal-body {
		padding: 22px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	.modal-body .field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.modal-body .field.full {
		grid-column: 1 / -1;
	}
	.modal-body .field-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--Text-Primary);
	}
	.modal-body .field-label .req {
		color: var(--mr-color-danger);
		margin-left: 2px;
	}
	.modal-body input,
	.modal-body textarea {
		width: 100%;
		min-height: 44px;
		padding: 10px 14px;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
		background: var(--Surface-Card);
		color: var(--Text-Primary);
		font-size: 14px;
		font-family: inherit;
	}
	.modal-body textarea {
		resize: vertical;
	}
	.modal-foot {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 16px 22px;
		border-top: 1px solid var(--Border-Subtle);
		position: sticky;
		bottom: 0;
		background: var(--Surface-Card);
	}

	@media (max-width: 560px) {
		.modal-body {
			grid-template-columns: 1fr;
		}
	}
`;

export function Modal({
	title,
	onClose,
	children,
	footer,
}: {
	title: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<ModalOverlay onClick={onClose}>
			<Box
				className="modal"
				onClick={(e: React.MouseEvent) => e.stopPropagation()}
			>
				<Box className="modal-head">
					<Text className="modal-title">{title}</Text>
					<Box
						className="icon-btn"
						onClick={onClose}
						style={{ cursor: "pointer" }}
					>
						<FiX size={18} />
					</Box>
				</Box>
				<Box className="modal-body">{children}</Box>
				{footer ? <Box className="modal-foot">{footer}</Box> : null}
			</Box>
		</ModalOverlay>
	);
}
