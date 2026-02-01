"use client";
import { type JSX, useMemo } from "react";
import {
	HashLoader,
	MoonLoader,
	PacmanLoader,
	RingLoader,
} from "react-spinners";
import type { LoaderSizeProps } from "react-spinners/helpers/props";
import { Box } from "..";

interface IProps {
	loader: "hashLoader" | "ringLoader" | "pacmanLoader" | "moonLoader";
	color?: string;
}

export default function Loader({ loader, color }: IProps) {
	const loaderType = useMemo((): JSX.Element => {
		const options: LoaderSizeProps = {
			// loading,
			size: 150,
			"aria-label": "Loading Spinner",
			speedMultiplier: 0.5,
			style: {
				width: "100%",
				height: "100%",
				userSelect: "none",
			},
			color: color ?? "var(--White)",
		};

		switch (loader) {
			case "hashLoader":
				return <HashLoader {...options} />;
			case "moonLoader":
				return <MoonLoader {...options} />;
			case "pacmanLoader":
				return <PacmanLoader {...options} />;
			case "ringLoader":
				return <RingLoader {...options} />;
		}
	}, [loader, color]);

	return (
		<Box $w="100%" $h="100%">
			<Box $grid $w="100%" $h="100%" $centerH $centerV>
				<Box
					$relative
					$grid
					$centerH
					$centerV
					$w="100%"
					$maxW="300px"
					$h="300px"
				>
					{loaderType}
				</Box>
			</Box>
		</Box>
	);
}
