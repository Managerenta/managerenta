"use client";
import { memo, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import { type ICalendarEvent, useCalendar } from "@/hooks";
import { EntityPageStyled } from "../shared/entity";
import { CalendarStyled } from "./styled";

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TYPE_META: Record<
	ICalendarEvent["type"],
	{ label: string; color: string; bg: string }
> = {
	"rent-due": { label: "Rent due", color: "#1D4E89", bg: "#E0ECFB" },
	"lease-expiry": { label: "Lease expiry", color: "#B91C1C", bg: "#F4E4E4" },
	maintenance: { label: "Maintenance", color: "#B45309", bg: "#FBEDE5" },
};

function CalendarWrapper() {
	const today = new Date();
	const [cursor, setCursor] = useState({
		year: today.getFullYear(),
		month: today.getMonth(),
	});
	const [selected, setSelected] = useState<string | null>(null);

	const { events, isLoading } = useCalendar(cursor.year, cursor.month);

	const eventsByDate = useMemo(() => {
		const map = new Map<string, ICalendarEvent[]>();
		for (const e of events) {
			const list = map.get(e.date) ?? [];
			list.push(e);
			map.set(e.date, list);
		}
		return map;
	}, [events]);

	const cells = useMemo(() => {
		const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
		const daysInMonth = new Date(
			cursor.year,
			cursor.month + 1,
			0,
		).getDate();
		const out: ({ day: number; key: string } | null)[] = [];
		for (let i = 0; i < firstDay; i++) out.push(null);
		for (let d = 1; d <= daysInMonth; d++) {
			const key = `${cursor.year}-${`${cursor.month + 1}`.padStart(2, "0")}-${`${d}`.padStart(2, "0")}`;
			out.push({ day: d, key });
		}
		return out;
	}, [cursor]);

	const move = (delta: number) => {
		setSelected(null);
		setCursor((c) => {
			const m = c.month + delta;
			return {
				year: c.year + Math.floor(m / 12),
				month: ((m % 12) + 12) % 12,
			};
		});
	};

	const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`;
	const selectedEvents = selected ? (eventsByDate.get(selected) ?? []) : [];

	return (
		<EntityPageStyled>
			<Box className="page-head">
				<Box className="titles">
					<Text className="title">Calendar</Text>
					<Text className="subtitle">
						Rent due dates, lease expiries and scheduled
						maintenance.
					</Text>
				</Box>
			</Box>

			<CalendarStyled>
				<Box className="cal-main">
					<Box className="cal-toolbar">
						<Box className="nav">
							<Box className="nav-btn" onClick={() => move(-1)}>
								<FiChevronLeft size={18} />
							</Box>
							<Text className="cal-month">
								{MONTHS[cursor.month]} {cursor.year}
							</Text>
							<Box className="nav-btn" onClick={() => move(1)}>
								<FiChevronRight size={18} />
							</Box>
						</Box>
						<Button
							title="Today"
							variant="ghost"
							size="sm"
							handleClick={() =>
								setCursor({
									year: today.getFullYear(),
									month: today.getMonth(),
								})
							}
						/>
					</Box>

					<Box className="legend">
						{Object.entries(TYPE_META).map(([k, m]) => (
							<Box key={k} className="legend-item">
								<span
									className="dot"
									style={{ background: m.color }}
								/>
								<Text>{m.label}</Text>
							</Box>
						))}
					</Box>

					<Box className="weekdays">
						{WEEKDAYS.map((w) => (
							<Text key={w} className="weekday">
								{w}
							</Text>
						))}
					</Box>
					<Box className="grid">
						{cells.map((cell, i) => {
							if (!cell)
								return (
									<Box
										key={`e-${i}`}
										className="cell empty"
									/>
								);
							const dayEvents = eventsByDate.get(cell.key) ?? [];
							const isToday = cell.key === todayKey;
							const isSelected = cell.key === selected;
							return (
								<Box
									key={cell.key}
									className={`cell ${isToday ? "today" : ""} ${
										isSelected ? "selected" : ""
									}`}
									onClick={() => setSelected(cell.key)}
								>
									<Text className="daynum">{cell.day}</Text>
									<Box className="chips">
										{dayEvents.slice(0, 3).map((e, idx) => (
											<Box
												key={idx}
												className="chip"
												style={{
													background:
														TYPE_META[e.type].bg,
													color: TYPE_META[e.type]
														.color,
												}}
												title={e.title}
											>
												{e.title}
											</Box>
										))}
										{dayEvents.length > 3 ? (
											<Text className="more">
												+{dayEvents.length - 3} more
											</Text>
										) : null}
									</Box>
								</Box>
							);
						})}
					</Box>
				</Box>

				<Box className="cal-side">
					<Text className="side-title">
						{selected
							? new Date(selected).toLocaleDateString("en-NG", {
									weekday: "long",
									day: "numeric",
									month: "long",
								})
							: "Select a day"}
					</Text>
					{selected && selectedEvents.length === 0 ? (
						<Text className="side-empty">
							No events on this day.
						</Text>
					) : null}
					{!selected ? (
						<Text className="side-empty">
							Pick a date to see its events.
							{isLoading ? " Loading…" : ""}
						</Text>
					) : null}
					<Box className="side-list">
						{selectedEvents.map((e, i) => (
							<Box key={i} className="side-event">
								<span
									className="bar"
									style={{
										background: TYPE_META[e.type].color,
									}}
								/>
								<Box>
									<Text className="se-title">{e.title}</Text>
									{e.subtitle ? (
										<Text className="se-sub">
											{e.subtitle}
										</Text>
									) : null}
									<Text className="se-type">
										{TYPE_META[e.type].label}
									</Text>
								</Box>
							</Box>
						))}
					</Box>
				</Box>
			</CalendarStyled>
		</EntityPageStyled>
	);
}

export default memo(CalendarWrapper);
