"use client";
import { memo, useMemo } from "react";
import { BsCalculator } from "react-icons/bs";
import { LiaCheckCircle } from "react-icons/lia";
import { Text } from "@/components";
import Reviews from "./components/Reviews";
import { KeyHighlightsStyled } from "./styled";

function KeyHighlights() {
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
		<KeyHighlightsStyled>
			<header>
				<BsCalculator />
				<Text>manageRenta</Text>
			</header>

			<Text className="title">Start Managing Smarter Today</Text>

			<ul>{lists}</ul>

			<Reviews />
		</KeyHighlightsStyled>
	);
}

export default memo(KeyHighlights);
