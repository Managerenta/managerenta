"use client";

import { memo } from "react";
import { Text } from "@/components";
import { AlternativeSeparatorStyled } from "./styled";

function AlternativeSeparator() {
	return (
		<AlternativeSeparatorStyled>
			<hr />
			<Text>Or</Text>
			<hr />
		</AlternativeSeparatorStyled>
	);
}

export default memo(AlternativeSeparator);
