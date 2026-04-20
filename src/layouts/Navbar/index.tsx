"use client";
import { useRouter } from "next/navigation";
import {
	memo,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { BsCalculator } from "react-icons/bs";
import { FiBell, FiChevronDown, FiLogOut } from "react-icons/fi";
import useSWR from "swr";
import { Box, Button, Image, Text } from "@/components";
import { fetcher } from "@/constants";
import { AppContextProvider } from "@/hooks";
import { NavbarStyled } from "./styled";

interface IProps {
	navHeight: string;
	background: string;
}

function Navbar({ background, navHeight }: IProps) {
	const { userName, deleteAllCookies } = useContext(AppContextProvider);
	const router = useRouter();
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const { data: profileData } = useSWR<{ data: { avatar?: string } }>(
		"/api/users/user-profile",
		fetcher,
	);
	const userAvatar = useMemo(
		() => profileData?.data?.avatar ?? "",
		[profileData],
	);

	const initials = useMemo(() => {
		if (!userName) return "?";
		return userName
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join("");
	}, [userName]);

	const handleLogout = useCallback(async () => {
		setDropdownOpen(false);
		await deleteAllCookies();
		router.push("/login");
	}, [deleteAllCookies, router]);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setDropdownOpen(false);
			}
		}
		if (dropdownOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, [dropdownOpen]);

	return (
		<NavbarStyled $navHeight={navHeight} $background={background}>
			<Box className="mobile-brand">
				<BsCalculator />
				<Text className="brand-name">manageRenta</Text>
			</Box>

			<Box className="nav-actions">
				<Box className="notification-bell">
					<FiBell size={20} />
					<Box className="badge">3</Box>
				</Box>

				<Box
					className="user-profile"
					ref={dropdownRef}
					onClick={() => setDropdownOpen((prev) => !prev)}
				>
					<Box className="avatar">
						{userAvatar ? (
							<Image
								url={userAvatar}
								alt={userName}
								width="100%"
								height="100%"
								style={{ objectFit: "cover" }}
							/>
						) : (
							initials
						)}
					</Box>
					<Text className="user-name">{userName || "User"}</Text>
					<FiChevronDown
						size={14}
						className={`chevron ${dropdownOpen ? "open" : ""}`}
					/>

					{dropdownOpen && (
						<Box className="user-dropdown">
							<Button
								type="button"
								title={
									<>
										<FiLogOut size={15} />
										<span>Logout</span>
									</>
								}
								handleClick={handleLogout}
								style={{ width: "100%" }}
							/>
						</Box>
					)}
				</Box>
			</Box>
		</NavbarStyled>
	);
}

export default memo(Navbar);
