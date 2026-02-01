"use client";
import dynamic from "next/dynamic";
// import FroalaEditorView from "react-froala-wysiwyg/FroalaEditorView";
// import FroalaEditorComponent from "react-froala-wysiwyg";
import { memo, useContext } from "react";
import "froala-editor/css/froala_style.min.css";
import "froala-editor/css/froala_editor.pkgd.min.css";
import { FroalaEditorStyled } from "./styled";
import "./plugins";
import { AppContextProvider } from "@/hooks";

interface IProps {
	data: string;
	height?: string;
	background?: string;
	color?: string;
	isReadOnly?: boolean;
	onChange: (v: string) => void;
}

const FroalaEditorView = dynamic(
	() => import("react-froala-wysiwyg/FroalaEditorView"),
	{
		ssr: false,
	},
);

const FroalaEditorComponent = dynamic(() => import("react-froala-wysiwyg"), {
	ssr: false,
});

function FroalaEditor({
	data,
	height,
	background,
	color,
	onChange,
	isReadOnly,
}: IProps) {
	const { env } = useContext(AppContextProvider);
	return (
		<FroalaEditorStyled
			$isReadOnly={isReadOnly || false}
			$height={height}
			$background={background}
			$color={color}
		>
			{isReadOnly ? (
				<FroalaEditorView model={data} />
			) : (
				<FroalaEditorComponent
					tag="textarea"
					config={{
						key: env.FROALA_LICENCE_KEY,
						placeholderText: "Edit Your Content Here!",
						charCounterCount: true,
						paragraphMultipleStyles: true,
						paragraphStyles: {
							"fr-text-gray": "Gray",
							"fr-text-bordered": "Bordered",
							"fr-text-spaced": "Spaced",
							"fr-text-uppercase": "Uppercase",
							"fr-text-beautify": "Text Beautify",
						},
						tableStyles: {
							"fr-dashed-borders": "Dashed Borders",
							"fr-alternate-rows": "Alternate Rows",
							"fr-no-border": "No Border",
							"fr-background-green": "Background Green",
						},
						imageStyles: {
							"fr-full-width": "Full Width",
							"fr-full-height": "Full Height",
							"fr-full-width-height": "Full Width & Height",
							"fr-aspect-ratio": "Aspect Ratio",
						},
					}}
					model={data}
					onModelChange={onChange}
				/>
			)}
		</FroalaEditorStyled>
	);
}

export default memo(FroalaEditor);
