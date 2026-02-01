"use client";
import {
	type Dispatch,
	Fragment,
	memo,
	type SetStateAction,
	useCallback,
	useMemo,
} from "react";
import { Box, Button, Text } from "../../components";
import { PaginationStyled } from "./styled";

interface IProps {
	totalPages: number;
	pageSize: number;
	offset: number;
	setOffset: Dispatch<SetStateAction<number>>;
}

function Pagination({ pageSize, totalPages, offset, setOffset }: IProps) {
	const currentPage = useMemo(() => {
		if (offset <= 0) return 1;
		return Math.ceil(offset / pageSize) + 1;
	}, [offset, pageSize]);

	const handleChange = useCallback(
		(type: "prev" | "next") => {
			let currentOffset = offset;

			switch (type) {
				case "prev":
					if (currentOffset - pageSize < 0) currentOffset = 0;
					else currentOffset = offset - pageSize;
					break;
				case "next":
					if (currentPage >= totalPages) return;
					currentOffset = offset + pageSize;
					break;
			}

			setOffset(currentOffset);
		},
		[pageSize, totalPages, offset, setOffset, currentPage],
	);

	const btns = useMemo(() => {
		const buttons: {
			show: boolean;
			title: string;
			handleClick: () => void;
		}[] = [
			{
				show: currentPage > 1,
				title: "Prev",
				handleClick: () => handleChange("prev"),
			},
			{
				show: currentPage < totalPages,
				title: "Next",
				handleClick: () => handleChange("next"),
			},
		];

		return buttons.map((item, index) => {
			if (!item.show) return <Fragment key={index}></Fragment>;
			return (
				<Button
					key={index}
					// disabled={true}
					title={item.title}
					width="80px"
					height="40px"
					borderRadius="12px"
					background="var(--Primary-Blue-main)"
					border="1px solid var(--dark-10)"
					color="var(--White)"
					handleClick={item.handleClick}
				/>
			);
		});
	}, [handleChange, currentPage, totalPages]);

	return (
		<PaginationStyled>
			<Text className="title">
				Page {currentPage} of {totalPages}
			</Text>

			<Box className="btns">{btns}</Box>
		</PaginationStyled>
	);
}

export default memo(Pagination);
