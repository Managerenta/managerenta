"use client";
import {
	type JSX,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import { useStyleMediaQuery } from "@/hooks";
import type {
	IArtContestSubmissionGallery,
	IMasonryDimension,
	IMasonryGalleryMetadata,
} from "@/types";

interface IProps<T> {
	images: IMasonryGalleryMetadata[];
	handleClick: (id: string) => void;
	spacing?: number;
	CustomPhotoWrapper?: (photo: T, index: number) => JSX.Element;
}

function MasonryGallery({
	images,
	handleClick,
	spacing,
	CustomPhotoWrapper,
}: IProps<IMasonryDimension>) {
	const [imageDimensions, setImageDimensions] = useState<IMasonryDimension[]>(
		[],
	);

	const { matches: isLargeMobileScreen } = useStyleMediaQuery({
		minOrMax: "max",
		widthOrHeight: "width",
		value: 600,
	});

	const { matches: isTabletScreen } = useStyleMediaQuery({
		minOrMax: "max",
		widthOrHeight: "width",
		value: 767,
	});

	const targetRowHeight = useMemo(() => {
		if (isLargeMobileScreen) return 250;

		return 220; // Default for larger screens
	}, [isLargeMobileScreen]);

	const maxPhotos = useMemo(() => {
		if (isTabletScreen)
			return 3; // For tablet screens, limit to 3 photos per row
		else if (isLargeMobileScreen) return 1; // For large mobile screens, limit to 2 photos per row
		// else if (isSmallMobileScreen) return 1; // For small mobile screens, limit to 1 photo per row
		return 5; // Default for larger screens
	}, [isTabletScreen, isLargeMobileScreen]);

	const loadAndTrackImage = useCallback(
		({
			imageUrl,
			artistSubmissionId,
			submissionProcessId,
			reactionActive,
			totalReactionsCount,
			user,
			disabled,
		}: {
			imageUrl: string;
			artistSubmissionId: string;
			submissionProcessId: number;
			reactionActive: boolean;
			totalReactionsCount: number;
			user?: IArtContestSubmissionGallery["users"][number];
			disabled: boolean;
		}) => {
			if (typeof window === "undefined") return;
			const img = new window.Image();
			img.src = imageUrl;

			img.onload = () => {
				setImageDimensions((prev) => [
					...prev,
					{
						src: imageUrl,
						url: imageUrl,
						width: img.width,
						height: img.height,
						id: artistSubmissionId,
						reactionActive,
						submissionProcessId,
						totalReactionsCount,
						user,
						disabled,
					},
				]);
			};

			img.onerror = () => {
				return;
			};
		},
		[],
	);

	const formattedPhotos = useMemo(() => {
		return imageDimensions.reduce(
			(prev: IMasonryDimension[], next: IMasonryDimension) => {
				if (!prev.find((item) => item.src === next.src))
					prev.push(next);
				return prev;
			},
			[],
		);
	}, [imageDimensions]);

	const loadImages = useCallback(() => {
		if (!images.length) return;
		Promise.allSettled(
			images.map((item) =>
				loadAndTrackImage({
					imageUrl: item.url,
					artistSubmissionId: item.id,
					submissionProcessId: item.submissionProcessId,
					reactionActive: item.reactionActive,
					totalReactionsCount: item.totalReactionsCount,
					user: item.user,
					disabled: item.disabled,
				}),
			),
		);
	}, [images, loadAndTrackImage]);

	useEffect(() => {
		loadImages();
	}, [loadImages]);

	return (
		<RowsPhotoAlbum
			spacing={spacing}
			photos={formattedPhotos}
			onClick={({ photo }: { photo: IMasonryDimension }) => {
				handleClick(photo.id);
			}}
			defaultContainerWidth={1200}
			breakpoints={[300, 600, 900, 1200]}
			sizes={{
				size: "1168px",
				sizes: [
					{
						viewport: "(max-width: 1200px)",
						size: "calc(100vw - 32px)",
					},
				],
			}}
			targetRowHeight={targetRowHeight}
			rowConstraints={{
				minPhotos: 1,
				maxPhotos: maxPhotos,
				singleRowMaxHeight: targetRowHeight,
			}}
			render={{
				extras: (_, { photo, index }) =>
					CustomPhotoWrapper
						? CustomPhotoWrapper?.(photo, index)
						: undefined,
			}}
		/>
	);
}

export default memo(MasonryGallery);
