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
import {
	FiAlertCircle,
	FiBell,
	FiCheckCircle,
	FiChevronDown,
	FiClock,
	FiDollarSign,
	FiKey,
	FiLogOut,
	FiUserCheck,
	FiUserPlus,
	FiUsers,
} from "react-icons/fi";
import useSWR from "swr";
import { Box, Button, Image, Text } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import {
	AppContextProvider,
	type INotificationRow,
	useNotificationsUnread,
	useToast,
} from "@/hooks";
import { NavbarStyled } from "./styled";

interface IProps {
	navHeight: string;
	background: string;
}

function notificationIcon(kind: INotificationRow["kind"]) {
	switch (kind) {
		case "rent-due":
		case "lease-expiry":
			return <FiClock size={16} />;
		case "rent-overdue":
			return <FiAlertCircle size={16} />;
		case "payment-received":
			return <FiDollarSign size={16} />;
		case "tenant-move-in":
			return <FiUserPlus size={16} />;
		case "tenant-move-out":
			return <FiLogOut size={16} />;
		case "org-invite":
			return <FiUsers size={16} />;
		case "email-verification":
			return <FiUserCheck size={16} />;
		case "password-reset":
			return <FiKey size={16} />;
		default:
			return <FiBell size={16} />;
	}
}

function relativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return "";
	const diff = Date.now() - then;
	const min = Math.round(diff / 60_000);
	if (min < 1) return "now";
	if (min < 60) return `${min}m`;
	const hr = Math.round(min / 60);
	if (hr < 24) return `${hr}h`;
	const day = Math.round(hr / 24);
	if (day < 7) return `${day}d`;
	return new Date(iso).toLocaleDateString();
}

function Navbar({ background, navHeight }: IProps) {
	const toast = useToast();
	const { userName, deleteAllCookies } = useContext(AppContextProvider);
	const router = useRouter();
	const [profileOpen, setProfileOpen] = useState(false);
	const [bellOpen, setBellOpen] = useState(false);
	const profileRef = useRef<HTMLDivElement>(null);
	const bellRef = useRef<HTMLDivElement>(null);

	const { data: profileData } = useSWR<{
		data: { avatar?: string; name?: string };
	}>("/api/users/user-profile", fetcher, { revalidateOnMount: true });
	const userAvatar = useMemo(
		() => profileData?.data?.avatar ?? "",
		[profileData],
	);
	const displayName = useMemo(
		() => profileData?.data?.name ?? userName ?? "",
		[profileData, userName],
	);

	const { unread, recent, mutate: mutateUnread } = useNotificationsUnread();
	const badge = unread > 99 ? "99+" : String(unread);

	const initials = useMemo(() => {
		if (!displayName) return "?";
		return displayName
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join("");
	}, [displayName]);

	const handleLogout = useCallback(async () => {
		setProfileOpen(false);
		await deleteAllCookies();
		router.push("/login");
	}, [deleteAllCookies, router]);

	const handleViewAll = useCallback(() => {
		setBellOpen(false);
		router.push("/notifications");
	}, [router]);

	const handleMarkAllRead = useCallback(async () => {
		try {
			await api().post("/api/notifications/read-all", {});
			await mutateUnread();
			toast.push("Marked all as read", { type: "success" });
		} catch (err) {
			toast.push(getErrorMessage(err, "Failed to mark as read"), {
				type: "warn",
			});
		}
	}, [mutateUnread, toast]);

	const handlePreviewClick = useCallback(
		async (n: INotificationRow) => {
			try {
				if (n.status !== "read") {
					await api().post(`/api/notifications/${n._id}/read`, {});
					await mutateUnread();
				}
			} catch {
				// non-blocking
			}
			setBellOpen(false);
			router.push("/notifications");
		},
		[mutateUnread, router],
	);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				profileRef.current &&
				!profileRef.current.contains(e.target as Node)
			) {
				setProfileOpen(false);
			}
			if (
				bellRef.current &&
				!bellRef.current.contains(e.target as Node)
			) {
				setBellOpen(false);
			}
		}
		if (profileOpen || bellOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, [profileOpen, bellOpen]);

	return (
		<NavbarStyled $navHeight={navHeight} $background={background}>
			<Box className="mobile-brand">
				<BsCalculator />
				<Text className="brand-name">manageRenta</Text>
			</Box>

			<Box className="nav-actions">
				<Box
					className="notification-bell"
					ref={bellRef}
					role="button"
					aria-haspopup="true"
					aria-expanded={bellOpen}
					tabIndex={0}
					onClick={() => setBellOpen((prev) => !prev)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							setBellOpen((prev) => !prev);
						}
					}}
				>
					<FiBell size={20} />
					{unread > 0 && (
						<Box className="badge" aria-label={`${unread} unread`}>
							{badge}
						</Box>
					)}

					{bellOpen && (
						<Box
							className="bell-dropdown"
							onClick={(e) => e.stopPropagation()}
						>
							<Box className="bell-header">
								<Box>
									<Text className="bell-title">
										Notifications
									</Text>
									<Text className="bell-subtitle">
										{unread > 0
											? `${unread} unread`
											: "Up to date"}
									</Text>
								</Box>
								{unread > 0 && (
									<button
										type="button"
										className="bell-mark-all"
										onClick={handleMarkAllRead}
									>
										<FiCheckCircle size={13} />
										<span>Mark all read</span>
									</button>
								)}
							</Box>

							<Box className="bell-list">
								{recent.length === 0 ? (
									<Box className="bell-empty">
										<FiBell size={22} />
										<Text>You're all caught up.</Text>
									</Box>
								) : (
									recent.map((n) => {
										const isUnread = n.status !== "read";
										return (
											<button
												type="button"
												key={n._id}
												className={`bell-row ${isUnread ? "unread" : ""}`}
												onClick={() =>
													handlePreviewClick(n)
												}
											>
												<Box className="bell-row-icon">
													{notificationIcon(n.kind)}
												</Box>
												<Box className="bell-row-text">
													<Text className="bell-row-title">
														{n.title}
													</Text>
													<Text className="bell-row-body">
														{n.body}
													</Text>
													<Text className="bell-row-time">
														{relativeTime(
															n.createdAt,
														)}
													</Text>
												</Box>
												{isUnread && (
													<Box className="bell-dot" />
												)}
											</button>
										);
									})
								)}
							</Box>

							<button
								type="button"
								className="bell-view-all"
								onClick={handleViewAll}
							>
								View all notifications
							</button>
						</Box>
					)}
				</Box>

				<Box
					className="user-profile"
					ref={profileRef}
					onClick={() => setProfileOpen((prev) => !prev)}
				>
					<Box className="avatar">
						{userAvatar ? (
							<Image
								url={userAvatar}
								alt={displayName}
								width="100%"
								height="100%"
								style={{ objectFit: "cover" }}
							/>
						) : (
							initials
						)}
					</Box>
					<Text className="user-name">{displayName || "User"}</Text>
					<FiChevronDown
						size={14}
						className={`chevron ${profileOpen ? "open" : ""}`}
					/>

					{profileOpen && (
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
