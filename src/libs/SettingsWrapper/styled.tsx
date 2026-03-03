"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const SettingsWrapperStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 20px;
	width: 100%;
	padding: 20px;
	background: #f8fafc;
	min-height: 100%;

	@media (max-width: 767px) {
		padding: 16px;
		gap: 16px;
	}
`;
