"use client";
import { useMemo } from "react";

export default function useReviews() {
	const reviews = useMemo(() => {
		const lists: {
			id: string;
			name: string;
			label: string;
			photo?: string;
			comment: string;
		}[] = [
			{
				id: "1",
				name: "Adebayo Okonkwo",
				label: "Lagos Property Owner",
				photo: "/images/landlords/landlord-1.png",
				comment:
					"manageRenta helped me organize my 15 properties and increased my rent collection by 40%",
			},
		];

		return lists;
	}, []);

	return { reviews };
}
