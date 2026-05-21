"use client";
import { memo, useCallback, useMemo, useState } from "react";
import {
	FiAlertCircle,
	FiBell,
	FiCheck,
	FiCheckCircle,
	FiClock,
	FiDollarSign,
	FiKey,
	FiLogOut,
	FiMail,
	FiTrash2,
	FiUserCheck,
	FiUserPlus,
	FiUsers,
} from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import { getErrorMessage } from "@/constants";
import { type INotificationRow, useNotifications, useToast } from "@/hooks";
import { NotificationsWrapperStyled } from "./styled";
import {
	groupNotifications,
	KIND_META,
	matchesFilter,
	type NotificationFilter,
	relativeTime,
} from "./utils";

const FILTERS: { id: NotificationFilter; label: string }[] = [
	{ id: "all", label: "All" },
	{ id: "unread", label: "Unread" },
	{ id: "payments", label: "Payments" },
	{ id: "reminders", label: "Reminders" },
	{ id: "tenants", label: "Tenants" },
	{ id: "system", label: "System" },
];

function kindIcon(kind: INotificationRow["kind"]) {
	switch (kind) {
		case "rent-due":
			return <FiClock size={18} />;
		case "rent-overdue":
			return <FiAlertCircle size={18} />;
		case "payment-received":
			return <FiDollarSign size={18} />;
		case "lease-expiry":
			return <FiClock size={18} />;
		case "tenant-move-in":
			return <FiUserPlus size={18} />;
		case "tenant-move-out":
			return <FiLogOut size={18} />;
		case "org-invite":
			return <FiUsers size={18} />;
		case "email-verification":
			return <FiUserCheck size={18} />;
		case "password-reset":
			return <FiKey size={18} />;
		default:
			return <FiBell size={18} />;
	}
}

function NotificationsWrapper() {
	const toast = useToast();
	const { rows, unread, total, isLoading, markRead, markAllRead, remove } =
		useNotifications({ limit: 100 });
	const [filter, setFilter] = useState<NotificationFilter>("all");

	const filtered = useMemo<INotificationRow[]>(
		() => rows.filter((n) => matchesFilter(n, filter)),
		[rows, filter],
	);

	const groups = useMemo(() => groupNotifications(filtered), [filtered]);

	const counts = useMemo(() => {
		const map: Record<NotificationFilter, number> = {
			all: rows.length,
			unread: rows.filter((n) => matchesFilter(n, "unread")).length,
			payments: rows.filter((n) => matchesFilter(n, "payments")).length,
			reminders: rows.filter((n) => matchesFilter(n, "reminders")).length,
			tenants: rows.filter((n) => matchesFilter(n, "tenants")).length,
			system: rows.filter((n) => matchesFilter(n, "system")).length,
		};
		return map;
	}, [rows]);

	const handleMarkAll = useCallback(async () => {
		try {
			await markAllRead();
			toast.push("Marked all as read", { type: "success" });
		} catch (err) {
			toast.push(getErrorMessage(err, "Failed to mark as read"), {
				type: "warn",
			});
		}
	}, [markAllRead, toast]);

	const handleMarkRead = useCallback(
		async (id: string) => {
			try {
				await markRead(id);
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed"), { type: "warn" });
			}
		},
		[markRead, toast],
	);

	const handleRemove = useCallback(
		async (id: string) => {
			try {
				await remove(id);
				toast.push("Notification removed", { type: "info" });
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed to remove"), {
					type: "warn",
				});
			}
		},
		[remove, toast],
	);

	return (
		<NotificationsWrapperStyled>
			<Box className="header">
				<Box className="header-left">
					<Box className="title-row">
						<Text className="title">Notifications</Text>
						{unread > 0 && (
							<Box
								className="unread-pill"
								aria-label="unread count"
							>
								{unread}
							</Box>
						)}
					</Box>
					<Text className="subtitle">
						{unread > 0
							? `You have ${unread} unread ${unread === 1 ? "notification" : "notifications"}.`
							: total === 0
								? "Your inbox is empty."
								: "Inbox is up to date."}
					</Text>
				</Box>
				<Box className="actions">
					<Button
						type="button"
						title={
							<Box className="btn-inner">
								<FiCheck size={14} />
								<span>Mark all read</span>
							</Box>
						}
						handleClick={handleMarkAll}
						disabled={unread === 0}
						background="var(--Surface-Card)"
						color="var(--Main-Blue)"
						border="1px solid var(--Border-Subtle)"
						borderRadius="8px"
					/>
				</Box>
			</Box>

			<Box className="filters" role="tablist">
				{FILTERS.map((f) => (
					<button
						type="button"
						key={f.id}
						className={`filter-chip ${filter === f.id ? "active" : ""}`}
						role="tab"
						aria-selected={filter === f.id}
						onClick={() => setFilter(f.id)}
					>
						<span>{f.label}</span>
						<span className="filter-count">{counts[f.id]}</span>
					</button>
				))}
			</Box>

			<Box className="list">
				{isLoading && rows.length === 0 && (
					<Box className="empty">
						<FiBell size={28} />
						<Text className="empty-title">Loading…</Text>
					</Box>
				)}
				{!isLoading && filtered.length === 0 && (
					<Box className="empty">
						<FiMail size={28} />
						<Text className="empty-title">
							{filter === "unread"
								? "No unread notifications"
								: "No notifications here"}
						</Text>
						<Text className="empty-desc">
							{filter === "all"
								? "Reminders, payments, and team activity will show up here."
								: "Switch filters to see other categories."}
						</Text>
					</Box>
				)}

				{groups.map((group) => (
					<Box key={group.key} className="group">
						<Text className="group-label">{group.label}</Text>
						<Box className="group-rows">
							{group.rows.map((n) => {
								const meta = KIND_META[n.kind];
								const unreadRow = n.status !== "read";
								return (
									<Box
										key={n._id}
										className={`row ${unreadRow ? "unread" : ""}`}
									>
										<Box
											className={`row-icon tone-${meta.tone}`}
										>
											{kindIcon(n.kind)}
										</Box>
										<Box className="row-text">
											<Box className="row-line">
												<Text className="row-title">
													{n.title}
												</Text>
												<Box
													className={`kind-pill tone-${meta.tone}`}
												>
													{meta.label}
												</Box>
											</Box>
											<Text className="row-body">
												{n.body}
											</Text>
											<Box className="row-meta">
												<span>
													{relativeTime(n.createdAt)}
												</span>
												<span className="dot">·</span>
												<span>
													{n.channel.toUpperCase()}
												</span>
												{n.to && (
													<>
														<span className="dot">
															·
														</span>
														<span>to {n.to}</span>
													</>
												)}
											</Box>
										</Box>
										<Box className="row-actions">
											{unreadRow && (
												<button
													type="button"
													className="row-action"
													title="Mark as read"
													aria-label="Mark as read"
													onClick={() =>
														handleMarkRead(n._id)
													}
												>
													<FiCheckCircle size={16} />
												</button>
											)}
											<button
												type="button"
												className="row-action danger"
												title="Remove"
												aria-label="Remove"
												onClick={() =>
													handleRemove(n._id)
												}
											>
												<FiTrash2 size={16} />
											</button>
										</Box>
									</Box>
								);
							})}
						</Box>
					</Box>
				))}
			</Box>
		</NotificationsWrapperStyled>
	);
}

export default memo(NotificationsWrapper);
