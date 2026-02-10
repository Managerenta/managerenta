"use client";

import { memo } from "react";
import { Text } from "@/components";
import { HeaderStyled } from "./styled";

interface IProps {
	title: string;
	subtext: string;
}

function Header({ title, subtext }: IProps) {
	return (
		<HeaderStyled>
			<h1>{title}</h1>
			<Text>{subtext}</Text>
		</HeaderStyled>
	);
}

export default memo(Header);
