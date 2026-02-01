"use client";
import type React from "react";
import type { CSSProperties } from "react";
import { TextStyled } from "./styled";
import type { TypographySize } from "./types";

interface IProps {
	className?: string;
	style?: CSSProperties;
	children: React.ReactNode | string;
	size?: TypographySize;
	color?: string;
	thin?: boolean;
	bold?: boolean;
	veryBold?: boolean;
	underline?: boolean;
	lineClamp?: number | string;
	onClick?: () => void;
}

const Text = ({
	className,
	thin,
	bold,
	veryBold,
	color,
	children,
	size,
	underline,
	lineClamp,
	onClick,
	style,
}: IProps) => {
	return (
		<TextStyled
			className={className || undefined}
			$size={size}
			$color={color}
			$thin={thin}
			$bold={bold}
			$veryBold={veryBold}
			$underline={underline}
			onClick={onClick}
			style={{
				...style,
				display: "-webkit-box",
				textOverflow: "ellipsis",
				overflow: "hidden",
				WebkitBoxOrient: "vertical",
				WebkitLineClamp: lineClamp ?? "unset",
			}}
		>
			{children}
		</TextStyled>
	);
};

export default Text;
