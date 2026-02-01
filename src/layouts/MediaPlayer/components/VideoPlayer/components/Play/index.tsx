"use client";
import type React from "react";
import { memo } from "react";
import { BsPlay } from "react-icons/bs";
import { IoPause } from "react-icons/io5";
import { Box } from "../../../../../../components";

interface Props {
	playing: boolean;
}

function Play({ playing }: Props) {
	const iconStyle: React.CSSProperties = {
		fontSize: "40px",
		color: "var(--Black)",
		background: "var(--dark-10)",
		borderRadius: "100%",
		padding: "5px 0px 5px 5px",
		opacity: "0.75",
	};
	return (
		<Box
			$w="40px"
			$h="40px"
			$background="transparent"
			$allowedtoclick
			style={{
				position: "absolute",
				bottom: "5px",
				right: "5px",
				zIndex: 1,
			}}
		>
			<Box $w="100%" $h="100%">
				<Box $grid $w="100%" $h="100%" style={{ placeItems: "end" }}>
					<Box
						$grid
						$centerV
						$w="100%"
						$h="100%"
						$margin="0 0px 5px 0"
						style={{ alignItems: "end" }}
					>
						{playing ? (
							<IoPause style={{ ...iconStyle, padding: "5px" }} />
						) : (
							<BsPlay style={iconStyle} />
						)}
					</Box>
				</Box>
			</Box>
		</Box>
	);
}

export default memo(Play);
