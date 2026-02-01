"use client";
import { memo } from "react";
import ReactPlayer from "react-player";
import { AudioPlayerStyled } from "./styled";

interface Props {
	url: string;
	thumbnail?: string;
	width?: string;
	height?: string;
}

const AudioPlayer = ({ url, height, width, thumbnail }: Props) => {
	return (
		<AudioPlayerStyled
			$thumbnail={thumbnail}
			$grid
			$centerV
			$w="100%"
			$h="auto"
			$borderR="inherit"
		>
			<ReactPlayer
				width={width ?? "100%"}
				height={height ?? "100%"}
				src={url}
				muted={false}
				loop={true}
				controls={true}
				pip={true}
				playing={true}
				// playsinline={true}
				volume={0.25}
				style={{
					// aspectRatio: 1,
					border: "unset",
					outline: "unset",
				}}
			/>
		</AudioPlayerStyled>
	);
};

export default memo(AudioPlayer);
