"use client";
import { memo } from "react";
import { Box, Text } from "../../components";
import { NotFoundStyled } from "./styled";

function NotFound() {
	return (
		<NotFoundStyled $grid $centerH $centerV $w="100%" $h="auto">
			<Box $grid $centerH $centerV>
				<Text size="l">Not found</Text>
			</Box>
			<Box $grid $centerH $centerV>
				<Text
					size="m"
					lineClamp={5}
					style={{ color: "var(--dark-15)", textAlign: "center" }}
				>
					We couldn&apos;t find anything with this criteria
				</Text>
			</Box>
		</NotFoundStyled>
	);
}

export default memo(NotFound);
