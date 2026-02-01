"use client";
import { memo, type ReactNode } from "react";
import { Box } from "@/components";
import { CloseSVG, Modal } from "@/layouts";
import { ModalWrapperStyled } from "./styled";

interface IProps {
	open: boolean;
	close: () => void;
	onCloseIconClick?: () => void;
	children: ReactNode;
	background?: string;
	border?: string;
	autoCloseOnClickOutside?: boolean;
}

function ModalWrapper({
	open,
	close,
	onCloseIconClick,
	children,
	background,
	border,
	autoCloseOnClickOutside,
}: IProps) {
	return (
		<Modal
			open={open}
			close={close}
			border={"unset"}
			background="unset"
			zIndex={3}
			autoCloseOnClickOutside={autoCloseOnClickOutside || true}
		>
			<ModalWrapperStyled
				$background={background}
				$border={border || "unset"}
			>
				<Box className="wrapper scrollbar-transparent">
					<Box className="close">
						<CloseSVG close={onCloseIconClick ?? close} />
					</Box>

					{children}
				</Box>
			</ModalWrapperStyled>
		</Modal>
	);
}

export default memo(ModalWrapper);
