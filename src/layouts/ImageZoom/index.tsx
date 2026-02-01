"use client";
import { memo, type ReactNode } from "react";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
interface IProps {
	children: ReactNode;
}

function ImageZoom({ children }: IProps) {
	return <Zoom wrapElement="span">{children}</Zoom>;
}

export default memo(ImageZoom);
