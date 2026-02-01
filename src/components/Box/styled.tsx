"use client";

import styled, { css } from "styled-components";

export const BoxStyled = styled.div<{
	$relative?: boolean;
	$absolute?: boolean;
	$top?: string;
	$left?: string;
	$right?: string;
	$bottom?: string;
	$margin?: string;
	$mt?: string;
	$mb?: string;
	$ml?: string;
	$mr?: string;
	$padding?: string;
	$pt?: string;
	$pb?: string;
	$pl?: string;
	$pr?: string;
	$row?: boolean;
	$column?: boolean;
	$flex?: boolean;
	$flexWrap?: string;
	$spread?: boolean;
	$startV?: boolean;
	$startH?: boolean;
	$centerV?: boolean;
	$centerH?: boolean;
	$endH?: boolean;
	$endV?: boolean;
	$grid?: boolean;
	$gridCols?: number;
	$gridColumn?: string;
	$gridRow?: string;
	$gridTemplateColumns?: string;
	$gap?: string;
	$border?: string;
	$borderTop?: string;
	$borderBot?: string;
	$borderLeft?: string;
	$borderRight?: string;
	$borderR?: string;
	$background?: string;
	$w?: string;
	$h?: string;
	$minW?: string;
	$minH?: string;
	$maxW?: string;
	$maxH?: string;
	$zIndex?: number;
	$allowedtoclick?: boolean;
	$opacity?: string;
	// ref?: any;
	$alignItems?: string;
	$placeItems?: string;
	$transition?: string;
}>`
	${({ $relative: relative }) =>
		relative &&
		css`
			position: relative;
		`}
	${({ $absolute: absolute }) =>
		absolute &&
		css`
			position: absolute;
		`}
    ${({ $top: top }) =>
		top &&
		css`
			top: ${top};
		`}
    ${({ $left: left }) =>
		left &&
		css`
			left: ${left};
		`}
    ${({ $right: right }) =>
		right &&
		css`
			right: ${right};
		`}
    ${({ $bottom: bottom }) =>
		bottom &&
		css`
			bottom: ${bottom};
		`}
    ${({ $margin: margin }) =>
		margin &&
		css`
			margin: ${margin};
		`}
    ${({ $mt: mt }) =>
		mt &&
		css`
			margin-top: ${mt}px;
		`}
    ${({ $mb: mb }) =>
		mb &&
		css`
			margin-bottom: ${mb}px;
		`}
    ${({ $ml: ml }) =>
		ml &&
		css`
			margin-left: ${ml}px;
		`}
    ${({ $mr: mr }) =>
		mr &&
		css`
			margin-right: ${mr}px;
		`}
    ${({ $padding: padding }) =>
		padding &&
		css`
			padding: ${padding};
		`}
    ${({ $pt: pt }) =>
		pt &&
		css`
			padding-top: ${pt}px;
		`}
    ${({ $pb: pb }) =>
		pb &&
		css`
			padding-bottom: ${pb}px;
		`}
    ${({ $pl: pl }) =>
		pl &&
		css`
			padding-left: ${pl}px;
		`}
    ${({ $pr: pr }) =>
		pr &&
		css`
			padding-right: ${pr}px;
		`}
    ${({ $row: row }) =>
		row &&
		css`
			display: flex;
		`}
    ${({ $column: column }) =>
		column &&
		css`
			display: flex;
			flex-direction: column;
		`}
    ${({ $flex: flex }) =>
		flex &&
		css`
			display: flex;
		`}

   
		${({ $flexWrap: flexWrap }) =>
			flexWrap &&
			css`
			flex-wrap: ${flexWrap};
		`}
			
    ${({ $spread: spread }) =>
		spread &&
		css`
			justify-content: space-between;
		`}
    ${({ $startV: startV }) =>
		startV &&
		css`
			align-items: flex-start;
		`}
    ${({ $startH: startH }) =>
		startH &&
		css`
			justify-content: start;
		`}
    ${({ $centerV: centerV }) =>
		centerV &&
		css`
			align-items: center;
		`}
    ${({ $centerH: centerH }) =>
		centerH &&
		css`
			justify-content: center;
		`}
    ${({ $endH: endH }) =>
		endH &&
		css`
			justify-content: end;
		`}
    ${({ $endV: endV }) =>
		endV &&
		css`
			align-items: flex-end;
		`}
    ${({ $grid: grid }) =>
		grid &&
		css`
			display: grid;
		`}
    ${({ $gridCols: gridCols }) =>
		gridCols &&
		css`
			grid-template-columns: repeat(${gridCols}, minmax(0, 1fr));
		`}
    ${({ $gridColumn: gridColumn }) =>
		gridColumn &&
		css`
			grid-column: ${gridColumn};
		`}
		${({ $gridRow: gridRow }) =>
			gridRow &&
			css`
			grid-row: ${gridRow};
		`}
    ${({ $gridTemplateColumns: gridTemplateColumns }) =>
		gridTemplateColumns &&
		css`
			grid-template-columns: ${gridTemplateColumns};
		`}
    ${({ $gap: gap }) =>
		gap &&
		css`
			gap: ${gap};
		`}
    ${({ $border: border }) =>
		border &&
		css`
			border: ${border};
		`}
    ${({ $borderTop: borderTop }) =>
		borderTop &&
		css`
			border-top: ${borderTop};
		`}
    ${({ $borderBot: borderBot }) =>
		borderBot &&
		css`
			border-bottom: ${borderBot};
		`}
    ${({ $borderLeft: borderLeft }) =>
		borderLeft &&
		css`
			border-left: ${borderLeft};
		`}
    ${({ $borderRight: borderRight }) =>
		borderRight &&
		css`
			border-right: ${borderRight};
		`}
    ${({ $borderR: borderR }) =>
		borderR &&
		css`
			border-radius: ${borderR};
		`}
    ${({ $background: background }) =>
		background &&
		css`
			background: ${background};
		`}
    ${({ $w: w }) =>
		w &&
		css`
			width: ${w};
		`}
    ${({ $h: h }) =>
		h &&
		css`
			height: ${h};
		`}
    ${({ $minW: minW }) =>
		minW &&
		css`
			min-width: ${minW};
		`}
	${({ $maxW: maxW }) =>
		maxW &&
		css`
			max-width: ${maxW};
		`}
    ${({ $minH: minH }) =>
		minH &&
		css`
			min-height: ${minH};
		`}
	${({ $maxH: maxH }) =>
		maxH &&
		css`
			min-height: ${maxH};
		`}
    ${({ $zIndex: zIndex }) =>
		zIndex &&
		css`
			zindex: ${zIndex};
		`}
    ${({ $allowedtoclick: allowedtoclick }) =>
		allowedtoclick &&
		css`
			cursor: pointer;
		`}
    ${({ $opacity: opacity }) =>
		opacity &&
		css`
			opacity: ${opacity};
		`}

    ${({ $alignItems: alignItems }) =>
		alignItems &&
		css`
			align-items: ${alignItems};
		`}
    ${({ $placeItems: placeItems }) =>
		placeItems &&
		css`
			place-items: ${placeItems};
		`}
		${({ $transition: transition }) =>
			transition &&
			css`
			transition: ${transition};
		`}
`;
