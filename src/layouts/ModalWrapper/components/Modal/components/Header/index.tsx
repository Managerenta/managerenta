"use client";
import { memo } from "react";
// import { AiOutlineCloseCircle } from "react-icons/ai";
import { Box, Text } from "../../../../../../components";

interface IProps {
	title: string;
	// handleClick: () => void;
}

function Header({ title }: IProps) {
	return (
		<Box
			$grid
			$gridCols={2}
			$w="100%"
			$h="50px"
			$padding="5px 20px"
			$borderBot={`1px solid var(--dark-10)`}
		>
			<Box $grid $centerV $w="100%" $h="100%">
				<Text
					bold
					size="l"
					style={{ letterSpacing: ".5px", wordSpacing: "2px" }}
				>
					{title}
				</Text>
			</Box>

			{/* <Box
                    $grid
                    $w="100%"
                    $h="100%"
                    style={{ placeItems: "end", alignItems: "center" }}
                >
                    <AiOutlineCloseCircle
                        onClick={handleClick}
                        style={{
                            color: "var(--Red)",
                            fontSize: "25px",
                            cursor: "pointer",
                        }}
                    />
                </Box> */}
		</Box>
	);
}

export default memo(Header);
