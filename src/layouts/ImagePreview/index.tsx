"use client";
import type React from "react";
import { memo } from "react";
import { Box, Image, Text } from "../../components";

interface IProps {
	alt: string;
	url?: string;
	collectionImage?: string;
	style?: React.CSSProperties;
}

function ImagePreview({ alt, url, collectionImage, style }: IProps) {
	return (
		<>
			{url ? (
				<Image
					alt={alt}
					url={url}
					width="100%"
					height="auto"
					borderRadius="inherit"
					style={{
						...style,
						objectFit: "contain",
						opacity: 1,
					}}
				/>
			) : (
				<Box $relative $w="100%" $h="auto" $borderR="inherit">
					<Image
						alt={alt}
						url={collectionImage}
						width="100%"
						height="100%"
						borderRadius="inherit"
						style={{
							...style,
							objectFit: "contain",
							opacity: 1,
							filter: "blur(7.5px)",
						}}
					/>

					{collectionImage && (
						<Box
							$w="100%"
							$h="100%"
							$background="transparent"
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								right: 0,
							}}
						>
							<Box $grid $centerV $centerH $w="100%" $h="100%">
								<Box
									$grid
									$centerV
									$centerH
									$w="100%"
									$h="auto"
								>
									<Image
										alt={alt}
										url={collectionImage}
										width="100%"
										height="auto"
										borderRadius="100%"
										style={{
											objectFit: "contain",
											maxWidth: "100px",
											margin: "auto",
										}}
									/>
								</Box>

								<Box
									$grid
									$centerV
									$centerH
									$w="100%"
									$h="auto"
								>
									<Text size="s">
										content not available yet
									</Text>
								</Box>
							</Box>
						</Box>
					)}
				</Box>
			)}
		</>
	);
}

export default memo(ImagePreview);
