"use client";

import { memo, useMemo } from "react";
import { BsCalculator } from "react-icons/bs";
import { LiaCheckCircle } from "react-icons/lia";
import { Text } from "@/components";
import Reviews from "./Reviews";
import { DetailsStyled } from "./styled";

function Details() {
	const lists = useMemo(() => {
		const data: string[] = [
			"Never miss a rent payment",
			"Track all properties in one place",
			"Automated tenant reminders",
			"Complete transaction history",
			"Generate detailed reports",
			"Collaborate with team members",
		];
		return data.map((item, index) => {
			return (
				<li key={index}>
					<LiaCheckCircle />
					<Text>{item}</Text>
				</li>
			);
		});
	}, []);

	return (
		<DetailsStyled>
			<header>
				<BsCalculator />
				<Text>PropertyTrack</Text>
			</header>

			<Text className="title">Start Managing Smarter Today</Text>

			<ul>{lists}</ul>

			<Reviews />
		</DetailsStyled>
	);
}

export default memo(Details);
