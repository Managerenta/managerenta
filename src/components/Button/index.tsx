"use client";
import Link from "next/link";
import { type CSSProperties, type ReactNode, useMemo } from "react";
import { type ButtonSize, ButtonStyled, type ButtonVariant } from "./styled";

interface IProps {
	style?: CSSProperties;
	title?: ReactNode;
	type?: "button" | "submit" | "reset";
	color?: string;
	background?: string;
	width?: string;
	height?: string;
	border?: string;
	borderRadius?: string;
	variant?: ButtonVariant;
	size?: ButtonSize;
	fullWidth?: boolean;
	leadingIcon?: ReactNode;
	trailingIcon?: ReactNode;
	handleClick?: any;
	disabled?: boolean;
	url?: string;
}

export default function Button({
	style,
	type,
	title,
	color,
	background,
	border,
	width,
	height,
	borderRadius,
	variant,
	size,
	fullWidth,
	leadingIcon,
	trailingIcon,
	handleClick,
	disabled,
	url,
}: IProps) {
	const btn = useMemo(() => {
		return (
			<ButtonStyled
				$width={width}
				$height={height}
				$borderRadius={borderRadius}
				$background={background}
				$border={border}
				$color={color}
				$variant={variant}
				$size={size}
				$fullWidth={fullWidth}
				type={type ?? "button"}
				style={style}
				onClick={handleClick}
				disabled={disabled}
			>
				{leadingIcon}
				{title}
				{trailingIcon}
			</ButtonStyled>
		);
	}, [
		title,
		type,
		style,
		width,
		height,
		borderRadius,
		background,
		color,
		border,
		variant,
		size,
		fullWidth,
		leadingIcon,
		trailingIcon,
		handleClick,
		disabled,
	]);

	return (
		<>
			{url ? (
				<Link
					href={url}
					target="_blank"
					style={{ color: "inherit", display: "inline-flex" }}
				>
					{btn}
				</Link>
			) : (
				btn
			)}
		</>
	);
}
