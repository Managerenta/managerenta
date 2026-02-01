"use client";
import { memo } from "react";
import ReactPlayer from "react-player";

// import { Box, Image } from "@/components";
// import { VideoPlayerStyled } from "./styled";

interface IProps {
	url: string;
	width?: string;
	height?: string;
	aspectRatio?: number | string;
	borderRadius?: string;
	controls: boolean;
	autoPlay: boolean;
	muted: boolean;
	background?: string;
}

function VideoPlayer({
	aspectRatio,
	url,
	height,
	width,
	borderRadius,
	// background,
	controls = true,
	autoPlay = true,
	muted = true,
}: IProps) {
	return (
		<>
			{/* <VideoPlayerStyled
				$borderRadius={borderRadius}
				$w={width ?? "100%"}
				$h={height ?? "100%"}>
				<Box
					$w="100%"
					$h="100%"
					style={{
						userSelect: "none",
						aspectRatio: aspectRatio ?? "unset",
					}}>
					<ReactPlayer
						url={url}
						muted={muted}
						loop={true}
						controls={controls}
						pip={true}
						playing={autoPlay}
						playsinline={true}
						width={"100%"}
						height={"auto"}
						style={{
							borderRadius: borderRadius ?? "unset",
						}}
					/>
				</Box>
			</VideoPlayerStyled> */}

			<ReactPlayer
				src={url}
				muted={muted}
				loop={true}
				controls={controls}
				pip={false}
				playing={autoPlay}
				playsInline={true}
				width={width ?? "100%"}
				height={height ?? "auto"}
				style={{
					borderRadius: borderRadius ?? "unset",
					userSelect: "none",
					aspectRatio: aspectRatio ?? "unset",
				}}
			/>
		</>
	);
}

export default memo(VideoPlayer);
