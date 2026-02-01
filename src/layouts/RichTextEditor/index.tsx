"use client";
// import { FroalaEditor } from "./components";
import dynamic from "next/dynamic";
import { memo } from "react";
import { RichTextEditorStyled } from "./styled";

interface IProps {
	isReadOnly: boolean;
	data?: string;
	height?: string;
	background?: string;
	color?: string;
	border?: string;
	onChange?: (v: string) => void;
}

const FroalaEditor = dynamic(
	() => import("./components").then((mod) => mod.FroalaEditor),
	{
		ssr: false,
	},
);

function RichTextEditor({
	data,
	height,
	background,
	color,
	// border,
	onChange,
	isReadOnly = false,
}: IProps) {
	return (
		<RichTextEditorStyled $w="100%" $h="100%">
			{/* <JoditEditor
                    isReadOnly={isReadOnly}
                    height={height}
                    background={background}
                    color={color}
                    onChange={onChange}
                /> */}
			<FroalaEditor
				data={data || ""}
				height={height}
				background={background}
				color={color}
				onChange={onChange || (() => {})}
				isReadOnly={isReadOnly}
			/>
		</RichTextEditorStyled>
	);
}

export default memo(RichTextEditor);
