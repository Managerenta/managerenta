"use client";
import { type CSSProperties, memo, useMemo } from "react";
import { Box, Image } from "../../../../components";
import { ImageZoom } from "../../../../layouts";

interface IProps {
	autoZoom?: boolean;
	width?: string;
	height?: string;
	url?: string;
	alt: string;
	aspectRatio?: number | string;
	borderRadius?: string;
	border?: string;
	background?: string;
	style?: CSSProperties;
}

function ImagePreview({
	autoZoom = true,
	url,
	height,
	width,
	alt,
	aspectRatio,
	borderRadius,
	border,
	background,
	style,
}: IProps) {
	const imageComponent = useMemo(
		() => (
			<Image
				alt={alt}
				url={url}
				width={width ?? "100%"}
				height={height ?? "100%"}
				aspectRatio={aspectRatio}
				borderRadius={borderRadius ?? "unset"}
				border={border ?? "unset"}
				style={style}
			/>
		),
		[alt, url, width, height, aspectRatio, borderRadius, border, style],
	);

	return (
		<Box $background={background} $w={width} $h={height}>
			{autoZoom ? (
				<ImageZoom>{imageComponent}</ImageZoom>
			) : (
				imageComponent
			)}
		</Box>
	);
}

export default memo(ImagePreview);
