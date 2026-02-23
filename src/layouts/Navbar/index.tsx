"use client";
import { memo } from "react";
import { BsCalculator } from "react-icons/bs";
import { FiBell, FiSearch } from "react-icons/fi";
import { Box, Input, Text } from "@/components";
import { NavbarStyled } from "./styled";

interface IProps {
	navHeight: string;
	background: string;
}

function Navbar({ background, navHeight }: IProps) {
	return (
		<NavbarStyled $navHeight={navHeight} $background={background}>
			<Box className="mobile-brand">
				<BsCalculator />
				<Text className="brand-name">PropertyTrack</Text>
			</Box>

			<Box className="search-bar">
				<FiSearch size={20} />
				<Input
					type="text"
					placeholder="Search properties by name or address..."
				/>
			</Box>

			<Box className="nav-actions">
				<Box className="notification-bell">
					<FiBell size={20} />
					<Box className="badge">3</Box>
				</Box>

				<Box className="user-profile">
					<Box className="avatar">JD</Box>
					<Text className="user-name">John Doe</Text>
				</Box>
			</Box>
		</NavbarStyled>
	);
}

export default memo(Navbar);
