"use client";
import Link from "next/link";
import {
	// ComponentProps,
	type CSSProperties,
	// MouseEventHandler,
	type ReactNode,
	useMemo,
} from "react";
import { ButtonStyled } from "./styled";

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
	// handleClick?: MouseEventHandler<HTMLButtonElement>;
	handleClick?: any;
	disabled?: boolean;
	url?: string;
}

// type IProps = ComponentProps<"button"> & {
// 	title?: ReactNode;
// 	color?: string;
// 	background?: string;
// 	width?: string;
// 	height?: string;
// 	border?: string;
// 	borderRadius?: string;
// 	handleClick?: any;
// 	disabled?: boolean;
// 	url?: string;
// };

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
				type={type ?? "button"}
				style={{
					...style,
				}}
				onClick={handleClick}
				disabled={disabled}
			>
				{title}
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
		handleClick,
		disabled,
	]);

	return (
		<>
			{url ? (
				<Link
					href={url as string}
					target="_blank"
					style={{ color: "inherit", width: "100%", height: "auto" }}
				>
					{btn}
				</Link>
			) : (
				btn
			)}
		</>
	);
}
