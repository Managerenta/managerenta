"use client";
import type {
	PlaceholderValue,
	StaticImport,
} from "next/dist/shared/lib/get-img-props";
import ImageLoader from "next/image";
import { type CSSProperties, useContext } from "react";
import { AppContextProvider } from "@/hooks";

interface IProps {
	width?: string;
	height?: string;
	style?: CSSProperties;
	url?: string | StaticImport;
	alt?: string;
	border?: string;
	borderRadius?: string;
	aspectRatio?: string | number;
	className?: string;
	title?: string;
	sizes?: string | undefined;
	placeholder?: PlaceholderValue;
	loading?: "lazy" | "eager";
}

export default function Image({
	aspectRatio,
	style,
	url,
	alt,
	width,
	height,
	border,
	borderRadius,
	className,
	title,
	sizes,
	placeholder,
	loading = "eager",
}: IProps) {
	const { env } = useContext(AppContextProvider);

	return (
		<ImageLoader
			className={className}
			unoptimized
			// priority
			loading={loading}
			// title="image"
			src={
				typeof url === "string" && url.length > 0
					? url
					: url
						? url
						: "-"
			}
			alt={alt ?? "image"}
			onError={({ currentTarget }) => {
				currentTarget.src = `${env.CDN_BASE_URL}/public/assets/${env.CDN_ASSETS_VERSION}/
				broken_image.webp`;
				currentTarget.src = "";
			}}
			title={title}
			sizes={sizes}
			width={0}
			height={0}
			placeholder={placeholder ?? "empty"}
			style={{
				opacity: 1,
				width: width ?? "auto",
				height: height ?? "auto",
				aspectRatio: aspectRatio ?? "unset",
				border: border ?? "unset",
				borderRadius: borderRadius ?? "unset",
				...style,
			}}
		/>
	);
}
