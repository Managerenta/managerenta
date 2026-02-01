"use client";
import { Fragment, memo, type ReactNode } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { Text } from "@/components";

interface IProps {
	id: string;
	children: ReactNode;
	toolTipText: string;
	clickable?: boolean;
}

function Tooltip({ id, children, toolTipText, clickable }: IProps) {
	return (
		<Fragment>
			<a data-tooltip-id={id}>{children}</a>
			<ReactTooltip id={id} clickable={clickable || true}>
				<Text size="m">{toolTipText}</Text>
			</ReactTooltip>
		</Fragment>
	);
}

export default memo(Tooltip);
