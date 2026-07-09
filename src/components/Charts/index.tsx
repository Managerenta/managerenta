"use client";
import { useId, useMemo } from "react";

/**
 * Dependency-free SVG charts. They scale to their container via a viewBox and
 * read theme colors from the caller so light/dark mode stays consistent.
 */

export interface IBarSeries {
	name: string;
	color: string;
}

export interface IBarDatum {
	label: string;
	values: number[];
}

export function GroupedBarChart({
	data,
	series,
	height = 240,
	formatValue,
}: {
	data: IBarDatum[];
	series: IBarSeries[];
	height?: number;
	formatValue?: (n: number) => string;
}) {
	const width = 640;
	const padL = 48;
	const padR = 12;
	const padT = 12;
	const padB = 28;
	const plotW = width - padL - padR;
	const plotH = height - padT - padB;

	const max = useMemo(() => {
		const m = Math.max(1, ...data.flatMap((d) => d.values));
		const pow = 10 ** Math.floor(Math.log10(m));
		return Math.ceil(m / pow) * pow;
	}, [data]);

	const groupW = plotW / Math.max(1, data.length);
	const barGap = 4;
	const barW = Math.max(
		2,
		(groupW * 0.62 - barGap * (series.length - 1)) / series.length,
	);

	const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			width="100%"
			height={height}
			role="img"
			aria-label="bar chart"
		>
			{ticks.map((t, ti) => {
				const y = padT + plotH - (t / max) * plotH;
				return (
					// Key by index: rounded tick values collide (e.g. all 0 when
					// max is 0, or [0,0,1,1,1] at low max). The list is fixed
					// and never reordered, so the index is a stable unique key.
					<g key={ti}>
						<line
							x1={padL}
							x2={width - padR}
							y1={y}
							y2={y}
							stroke="var(--Border-Subtle)"
							strokeWidth={1}
						/>
						<text
							x={padL - 8}
							y={y + 4}
							textAnchor="end"
							fontSize={10}
							fill="var(--mr-color-text-subtle)"
						>
							{formatValue ? formatValue(t) : t}
						</text>
					</g>
				);
			})}
			{data.map((d, gi) => {
				const gx =
					padL +
					gi * groupW +
					(groupW -
						(barW * series.length + barGap * (series.length - 1))) /
						2;
				return (
					<g key={d.label}>
						{d.values.map((v, si) => {
							const h = (v / max) * plotH;
							const x = gx + si * (barW + barGap);
							const y = padT + plotH - h;
							return (
								<rect
									key={si}
									x={x}
									y={y}
									width={barW}
									height={Math.max(0, h)}
									rx={2}
									fill={series[si]?.color}
								>
									<title>{`${d.label} · ${series[si]?.name}: ${
										formatValue ? formatValue(v) : v
									}`}</title>
								</rect>
							);
						})}
						<text
							x={padL + gi * groupW + groupW / 2}
							y={height - 8}
							textAnchor="middle"
							fontSize={10}
							fill="var(--mr-color-text-subtle)"
						>
							{d.label}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

export function Donut({
	segments,
	size = 180,
	thickness = 22,
	centerLabel,
	centerSub,
}: {
	segments: { label: string; value: number; color: string }[];
	size?: number;
	thickness?: number;
	centerLabel?: string;
	centerSub?: string;
}) {
	const radius = (size - thickness) / 2;
	const cx = size / 2;
	const cy = size / 2;
	const circumference = 2 * Math.PI * radius;
	const total = segments.reduce((a, s) => a + s.value, 0) || 1;

	let offset = 0;
	return (
		<svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
			<circle
				cx={cx}
				cy={cy}
				r={radius}
				fill="none"
				stroke="var(--Border-Subtle)"
				strokeWidth={thickness}
			/>
			{segments.map((s) => {
				const len = (s.value / total) * circumference;
				const dash = `${len} ${circumference - len}`;
				const el = (
					<circle
						key={s.label}
						cx={cx}
						cy={cy}
						r={radius}
						fill="none"
						stroke={s.color}
						strokeWidth={thickness}
						strokeDasharray={dash}
						strokeDashoffset={-offset}
						transform={`rotate(-90 ${cx} ${cy})`}
						strokeLinecap="butt"
					>
						<title>{`${s.label}: ${s.value}`}</title>
					</circle>
				);
				offset += len;
				return el;
			})}
			{centerLabel ? (
				<text
					x={cx}
					y={cy - 2}
					textAnchor="middle"
					fontSize={26}
					fontWeight={700}
					fill="var(--Black)"
				>
					{centerLabel}
				</text>
			) : null}
			{centerSub ? (
				<text
					x={cx}
					y={cy + 18}
					textAnchor="middle"
					fontSize={11}
					fill="var(--mr-color-text-subtle)"
				>
					{centerSub}
				</text>
			) : null}
		</svg>
	);
}

export function Gauge({
	value,
	label,
	color = "var(--mr-color-brand)",
	size = 160,
}: {
	value: number;
	label?: string;
	color?: string;
	size?: number;
}) {
	const clamped = Math.max(0, Math.min(100, value));
	const gid = useId();
	return (
		<Donut
			size={size}
			thickness={18}
			centerLabel={`${clamped}%`}
			centerSub={label}
			segments={[
				{ label: label ?? gid, value: clamped, color },
				{ label: "rest", value: 100 - clamped, color: "transparent" },
			]}
		/>
	);
}

export function HBarList({
	items,
	formatValue,
}: {
	items: { label: string; value: number; sub?: string; color?: string }[];
	formatValue?: (n: number) => string;
}) {
	const max = Math.max(1, ...items.map((i) => i.value));
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			{items.map((i) => (
				<div key={i.label}>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: 13,
							marginBottom: 4,
							color: "var(--Text-Primary)",
						}}
					>
						<span>{i.label}</span>
						<span style={{ color: "var(--Text-Secondary)" }}>
							{i.sub ??
								(formatValue ? formatValue(i.value) : i.value)}
						</span>
					</div>
					<div
						style={{
							height: 8,
							borderRadius: 999,
							background: "var(--mr-color-subtle)",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								width: `${(i.value / max) * 100}%`,
								height: "100%",
								borderRadius: 999,
								background: i.color ?? "var(--mr-color-brand)",
							}}
						/>
					</div>
				</div>
			))}
		</div>
	);
}
