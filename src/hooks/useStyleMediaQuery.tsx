"use client";
import { useEffect, useState } from "react";

interface IProps {
	minOrMax: "min" | "max";
	widthOrHeight: "width" | "height";
	value: number;
}

export default function useStyleMediaQuery({
	minOrMax,
	widthOrHeight,
	value,
}: IProps) {
	const [matches, setMatches] = useState<boolean>(false);

	useEffect(() => {
		if (!window) return;
		window
			.matchMedia(`(${minOrMax}-${widthOrHeight}: ${value}px)`)
			.addEventListener("change", (e) => setMatches(e.matches));
	}, [minOrMax, widthOrHeight, value]);

	return { matches };
}
