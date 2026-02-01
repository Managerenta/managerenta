import styled from "styled-components";

export const ButtonStyled = styled.button<{
	$width?: string;
	$height?: string;
	$borderRadius?: string;
	$background?: string;
	$border?: string;
	$color?: string;
}>`
	background: ${({ $background }) => $background || "var(--Primary-Blue-main)"};
	color: ${({ $color }) => $color || "inherit"};
	width: ${({ $width }) => $width || "100%"};
	height: ${({ $height }) => $height || "44px"};
	border-radius: ${({ $borderRadius }) => $borderRadius || "23px"};
	border: ${({ $border, $background }) =>
		$border || `1px solid ${$background}`};
`;
