"use client";
import type { EmblaCarouselType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import { type JSX, memo, useCallback, useEffect, useState } from "react";
import { MdCircle } from "react-icons/md";
// import "./base.css";
import { Box } from "../../../components";
import { Show } from "../../../layouts";
import { NextButton, PrevButton } from "./components";
import { CarouselBannerStyled } from "./styled";

interface IProps {
	items: JSX.Element[];
	showButtons?: boolean;
}

function CarouselBanner({ items, showButtons }: IProps) {
	const [, setPrevBtnDisabled] = useState<boolean>(true);
	const [, setNextBtnDisabled] = useState<boolean>(true);
	const [selectedIndex, setSelectedIndex] = useState<number>(0);
	const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

	const [emblaRef, emblaApi] = useEmblaCarousel({
		loop: true,
	});

	const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
	const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

	const scrollTo = useCallback(
		(index: number) => emblaApi?.scrollTo(index),
		[emblaApi],
	);

	const onInit = useCallback((emblaApi: EmblaCarouselType) => {
		setScrollSnaps(emblaApi.scrollSnapList());
	}, []);

	const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
		setSelectedIndex(emblaApi.selectedScrollSnap());
		setPrevBtnDisabled(!emblaApi.canScrollPrev());
		setNextBtnDisabled(!emblaApi.canScrollNext());
	}, []);

	useEffect(() => {
		if (!emblaApi) return;

		onInit(emblaApi);
		onSelect(emblaApi);
		emblaApi.on("reInit", onInit);
		emblaApi.on("reInit", onSelect);
		emblaApi.on("select", onSelect);
	}, [emblaApi, onInit, onSelect]);

	return (
		<CarouselBannerStyled $relative $w="100%" $h="auto">
			<Box className="embla" $w="100%" $h="auto">
				<Box
					className="embla__viewport"
					ref={emblaRef}
					$w="100%"
					$h="auto"
				>
					<Box className="embla__container" $w="100%" $h="auto">
						{items}
					</Box>
				</Box>
			</Box>

			<Show>
				<Show.When isTrue={!showButtons ? false : Boolean(showButtons)}>
					<Box className="embla__buttons">
						<PrevButton onClick={scrollPrev} />
						<NextButton onClick={scrollNext} />
					</Box>
				</Show.When>
			</Show>

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
							color:
								index === selectedIndex
									? "var(--White)"
									: "var(--Black)",
						}}
					/>
				))}
			</Box>
		</CarouselBannerStyled>
	);
}

export default memo(CarouselBanner);
