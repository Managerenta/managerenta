"use client";
import type { EmblaCarouselType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import { type JSX, memo, useCallback, useEffect, useState } from "react";
import { MdCircle } from "react-icons/md";
import { Box } from "../../../components";
import { CarouselStyled } from "./styled";

interface IProps {
	cardwidth?: number;
	items: JSX.Element[];
	showSnapSelector: boolean;
	gap?: string;
}

function CarouselCard({ items, cardwidth, gap, showSnapSelector }: IProps) {
	const [selectedIndex, setSelectedIndex] = useState<number>(0);
	const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

	const [emblaRef, emblaApi] = useEmblaCarousel({
		slidesToScroll: 1,
		align: "center",
		loop: false,
	});

	const onInit = useCallback((emblaApi: EmblaCarouselType) => {
		setScrollSnaps(emblaApi.scrollSnapList());
	}, []);

	const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
		setSelectedIndex(emblaApi.selectedScrollSnap());
	}, []);

	const scrollTo = useCallback(
		(index: number) => emblaApi?.scrollTo(index),
		[emblaApi],
	);

	useEffect(() => {
		if (!emblaApi) return;

		onInit(emblaApi);
		onSelect(emblaApi);
		emblaApi.on("reInit", onInit);
		emblaApi.on("reInit", onSelect);
		emblaApi.on("select", onSelect);
	}, [emblaApi, onInit, onSelect]);

	return (
		<CarouselStyled
			ref={emblaRef}
			$cardwidth={cardwidth ?? 100}
			className="embla"
			$gap={gap ?? "10px"}
			$w="100%"
			$h="auto"
		>
			<Box
				key="embla__container"
				$w="100%"
				$h="auto"
				className="embla__container"
				$gap={gap ?? "20px"}
			>
				{items}
			</Box>

			{showSnapSelector && scrollSnaps?.length > 1 && (
				<Box className="embla__dots">
					{scrollSnaps.map((_, index) => (
						<MdCircle
							key={index}
							onClick={() => scrollTo(index)}
							className={"embla__dot".concat(
								index === selectedIndex
									? " embla__dot--selected"
									: "",
							)}
							style={{
								width: "16px",
								height: "16px",
								color:
									index === selectedIndex
										? "var(--White)"
										: "var(--Black)",
							}}
						/>
					))}
				</Box>
			)}
		</CarouselStyled>
	);
}

export default memo(CarouselCard);
