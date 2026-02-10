"use client";

import { memo, useMemo } from "react";
import { Box, Image, Text } from "@/components";
import { useReviews } from "@/hooks";
import { ReviewsStyled } from "./styled";

function Reviews() {
	const { reviews } = useReviews();

	const reviewsList = useMemo(() => {
		return reviews.map((review) => {
			return (
				<Box key={review.id} className="review">
					<Box className="header">
						<Image url={review.photo || ""} alt={review.name} />
						<Box>
							<h4>{review.name}</h4>
							<Text>{review.label}</Text>
						</Box>
					</Box>
					<Text>"{review.comment}"</Text>
				</Box>
			);
		});
	}, [reviews]);

	return <ReviewsStyled>{reviewsList}</ReviewsStyled>;
}

export default memo(Reviews);
