"use client";
import type React from "react";
import {
	type CSSProperties,
	memo,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { createPortal } from "react-dom";
import { Box } from "../../../../components";
import { AppContextProvider, useDragZone } from "../../../../hooks";
import { Header } from "./components";
import { ModalStyled } from "./styled";

interface IProps {
	title?: string;
	open: boolean;
	close: () => void;
	children: React.ReactNode;
	color?: string;
	background?: string;
	border?: string;
	zIndex?: number;
	style?: CSSProperties;
	autoCloseOnClickOutside?: boolean;
}

function Modal({
	children,
	open,
	close,
	title,
	color,
	background,
	border,
	style,
	zIndex,
	autoCloseOnClickOutside = true,
}: IProps) {
	const { navHeight, isBrowser } = useContext(AppContextProvider);
	const modalRef = useRef<HTMLDivElement>(null);
	const { clearPreviousFiles } = useDragZone();

	const handleClickOutside = useCallback(
		(event: MouseEvent) => {
			if (
				modalRef.current &&
				!modalRef.current.contains(event.target as Node)
			)
				close();
		},
		[close],
	);

	useEffect(() => clearPreviousFiles(), [clearPreviousFiles]);

	useEffect(() => {
		if (!autoCloseOnClickOutside || !isBrowser) return;
		if (open) document.addEventListener("mousedown", handleClickOutside);

		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, [handleClickOutside, open, isBrowser, autoCloseOnClickOutside]);

	const modal = useMemo(() => {
		return (
			<ModalStyled
				$open={open}
				$navHeight={navHeight}
				$color={color}
				$background={background}
				$border={border}
				$zIndex={zIndex}
			>
				<Box className="container">
					<Box className="wrapper">
						<Box
							className="item"
							ref={modalRef}
							style={{
								...style,
							}}
						>
							{title && <Header title={title} />}

							{children}
						</Box>
					</Box>
				</Box>
			</ModalStyled>
		);
	}, [
		background,
		children,
		color,
		open,
		title,
		navHeight,
		border,
		style,
		zIndex,
	]);

	if (!isBrowser) return null;

	const modalRoot = document.getElementById("modal-popup");
	if (!modalRoot) return null;

	return createPortal(modal, modalRoot);
}

export default memo(Modal);
