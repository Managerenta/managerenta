"use client";
import dynamic from "next/dynamic";
import { type CSSProperties, memo, useMemo } from "react";
import { Box } from "@/components";
import { SupportedMimeTypes } from "@/types";
import {
	AudioPlayer,
	FbxPreview,
	ImagePreview,
	ModelPreview,
} from "./components";

interface IProps {
	alt: string;
	aspectRatio?: number | string;
	width?: string;
	height?: string;
	border?: string;
	borderRadius?: string;
	fileLink?: string;
	mimetype?: string;
	autoZoom?: boolean;
	background?: string;
	style?: CSSProperties;
	audioProps?: {
		thumbnail?: string;
	};
	videoProps?: {
		controls?: boolean;
		autoPlay?: boolean;
		muted?: boolean;
	};
}

const VideoPlayer = dynamic(
	() => import("./components").then((mod) => mod.VideoPlayer),
	{
		ssr: false,
	},
);

function MediaPlayer({
	alt,
	aspectRatio,
	fileLink,
	mimetype,
	width,
	height,
	borderRadius,
	background,
	border,
	style,
	videoProps,
	audioProps,
	autoZoom = true,
}: IProps) {
	const contentPlayer = useMemo(() => {
		if (!fileLink || !mimetype) return <Box />;
		switch (mimetype) {
			case SupportedMimeTypes.GLTF:
				return (
					<ModelPreview
						url={fileLink}
						height={height}
						width={width ?? "100%"}
					/>
				);
			case SupportedMimeTypes.FBX:
				return (
					<FbxPreview
						url={fileLink}
						height={height}
						width={width ?? "100%"}
					/>
				);
			case SupportedMimeTypes.MP4:
			case SupportedMimeTypes.QUICKTIME:
			case SupportedMimeTypes.OCTET_STREAM:
			case SupportedMimeTypes.X_QUICKTIME:
				return (
					<VideoPlayer
						url={fileLink}
						width={width ?? "100%"}
						height={height}
						aspectRatio={aspectRatio}
						borderRadius={borderRadius}
						controls={videoProps?.controls ?? true}
						autoPlay={videoProps?.autoPlay ?? true}
						muted={videoProps?.muted ?? true}
						background={background}
					/>
				);
			case SupportedMimeTypes.MP3:
				return (
					<AudioPlayer
						url={fileLink}
						height={height}
						width="100%"
						thumbnail={audioProps?.thumbnail}
					/>
				);
			case SupportedMimeTypes.PNG:
			case SupportedMimeTypes.JPG:
			case SupportedMimeTypes.JPEG:
			case SupportedMimeTypes.SVG:
			case SupportedMimeTypes.WEBP:
				return (
					<ImagePreview
						url={fileLink}
						width="100%"
						height={height}
						alt={alt}
						aspectRatio={aspectRatio}
						borderRadius={borderRadius}
						border={border}
						style={style}
						background={background}
						autoZoom={autoZoom}
					/>
				);

			default:
				return (
					<Box $w="100%" $h="100%" $padding="12px">
						File type not supported!
					</Box>
				);
		}
	}, [
		fileLink,
		mimetype,
		height,
		aspectRatio,
		borderRadius,
		// thumbnail,
		alt,
		// controls,
		// autoPlay,
		// muted,
		background,
		border,
		width,
		style,
		videoProps,
		audioProps,
		autoZoom,
	]);

	return (
		<Box $w="100%" $h={height ?? "100%"} $borderR="inherit">
			{contentPlayer}
		</Box>
	);
}

export default memo(MediaPlayer);
