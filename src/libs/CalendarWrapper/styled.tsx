"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const CalendarStyled = styled(Box)`
	display: grid;
	grid-template-columns: 1fr 300px;
	gap: 16px;
	align-items: start;

	.cal-main {
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-md);
		padding: 16px;
		box-shadow: var(--mr-shadow-sm);
	}
	.cal-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}
	.nav {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.nav-btn {
		width: 34px;
		height: 34px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
		cursor: pointer;
		color: var(--Text-Secondary);
	}
	.nav-btn:hover {
		color: var(--Text-Primary);
		border-color: var(--mr-color-border-strong);
	}
	.cal-month {
		font-size: 17px;
		font-weight: 700;
		color: var(--Black);
		min-width: 160px;
		text-align: center;
	}
	.legend {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--Text-Secondary);
	}
	.dot {
		width: 9px;
		height: 9px;
		border-radius: 999px;
		display: inline-block;
	}
	.weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 6px;
		margin-bottom: 6px;
	}
	.weekday {
		text-align: center;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--Text-Secondary);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 6px;
	}
	.cell {
		min-height: 92px;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
		padding: 6px;
		cursor: pointer;
		background: var(--Surface-Card);
		transition: border-color var(--mr-dur-fast), background var(--mr-dur-fast);
		overflow: hidden;
	}
	.cell:hover {
		border-color: var(--mr-color-border-strong);
	}
	.cell.empty {
		background: transparent;
		border-color: transparent;
		cursor: default;
	}
	.cell.today {
		border-color: var(--mr-color-brand);
		box-shadow: inset 0 0 0 1px var(--mr-color-brand);
	}
	.cell.selected {
		background: var(--mr-color-brand-soft);
	}
	.daynum {
		font-size: 13px;
		font-weight: 600;
		color: var(--Text-Primary);
	}
	.chips {
		display: flex;
		flex-direction: column;
		gap: 3px;
		margin-top: 4px;
	}
	.chip {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: var(--mr-radius-xs);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.more {
		font-size: 10px;
		color: var(--Text-Secondary);
	}

	.cal-side {
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-md);
		padding: 18px;
		box-shadow: var(--mr-shadow-sm);
		position: sticky;
		top: 16px;
	}
	.side-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--Black);
		margin-bottom: 12px;
	}
	.side-empty {
		font-size: 13px;
		color: var(--Text-Secondary);
	}
	.side-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.side-event {
		display: flex;
		gap: 10px;
		padding: 10px;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
	}
	.side-event .bar {
		width: 4px;
		border-radius: 999px;
		flex-shrink: 0;
	}
	.se-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--Text-Primary);
	}
	.se-sub {
		font-size: 12px;
		color: var(--Text-Secondary);
	}
	.se-type {
		font-size: 11px;
		color: var(--mr-color-text-subtle);
		margin-top: 2px;
	}

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
		.cal-side {
			position: static;
		}
		.cell {
			min-height: 70px;
		}
	}

	@media (max-width: 767px) {
		.cal-main {
			padding: 12px;
		}
		.cal-month {
			min-width: 0;
			font-size: 15px;
		}
		.weekdays,
		.grid {
			gap: 4px;
		}
		.weekday {
			font-size: 10px;
		}
		.cell {
			min-height: 60px;
			padding: 4px;
		}
	}
`;
