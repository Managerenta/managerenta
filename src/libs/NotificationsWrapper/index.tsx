"use client";
import { memo, useCallback, useMemo } from "react";
import {
	FiAlertCircle,
	FiBell,
	FiCheck,
	FiDollarSign,
	FiKey,
	FiMail,
	FiUsers,
} from "react-icons/fi";
import useSWR from "swr";
import { Box, Button, Text } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import { NotificationsWrapperStyled } from "./styled";

interface NotificationRow {
	_id: string;
	channel: "email" | "sms" | "whatsapp" | "in-app";
	kind: string;
	title: string;
	body: string;
	to?: string;
	status: "queued" | "sent" | "failed" | "read";
	createdAt: string;
	sentAt?: string;
	readAt?: string;
}

interface ListResponse {
	data?: {
		data: NotificationRow[];
		total: number;
		unread: number;
	};
}

function kindIcon(kind: string) {
	switch (kind) {
		case "rent-due":
		case "rent-overdue":
			return <FiAlertCircle size={18} />;
		case "payment-received":
			return <FiDollarSign size={18} />;
		case "org-invite":
			return <FiUsers size={18} />;
		case "email-verification":
		case "password-reset":
			return <FiKey size={18} />;
		default:
			return <FiBell size={18} />;
	}
}

function NotificationsWrapper() {
	const toast = useToast();
	const { data, mutate, isLoading } = useSWR<ListResponse>(
		"/api/notifications?limit=50",
		fetcher,
		{ revalidateOnMount: true, refreshInterval: 30000 },
	);

	const rows = useMemo<NotificationRow[]>(
		() => data?.data?.data ?? [],
		[data],
	);
	const unread = data?.data?.unread ?? 0;

	const markAllRead = useCallback(async () => {
		try {
			await api().post("/api/notifications/read-all", {});
			await mutate();
			toast.push("Marked all as read", { type: "success" });
		} catch (err) {
			toast.push(getErrorMessage(err, "Failed to mark as read"), {
				type: "warn",
			});
		}
	}, [mutate, toast]);

	const markRead = useCallback(
		async (id: string) => {
			try {
				await api().post(`/api/notifications/${id}/read`, {});
				await mutate();
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed"), { type: "warn" });
			}
		},
		[mutate, toast],
	);

	return (
		<NotificationsWrapperStyled>
			<Box className="header">
				<Box>
					<Text className="title">Notifications</Text>
					<Text className="subtitle">
						{unread > 0
							? `You have ${unread} unread`
							: "Inbox is up to date"}
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
						handleClick={markAllRead}
						disabled={unread === 0}
						background="var(--Surface-Card)"
						color="var(--Main-Blue)"
						border="1px solid var(--Border-Subtle)"
						borderRadius="8px"
					/>
				</Box>
			</Box>

			<Box className="list">
				{rows.length === 0 && !isLoading && (
					<Box className="empty">
						<FiMail size={28} />
						<Text className="empty-title">
							No notifications yet
						</Text>
						<Text className="empty-desc">
							Reminders, payments, and team invites will show up
							here.
						</Text>
					</Box>
				)}
				{rows.map((n) => (
					<Box
						key={n._id}
						className={`row ${n.status !== "read" ? "unread" : ""}`}
						onClick={() => markRead(n._id)}
					>
						<Box className="row-icon">{kindIcon(n.kind)}</Box>
						<Box className="row-text">
							<Text className="row-title">{n.title}</Text>
							<Text className="row-body">{n.body}</Text>
							<Text className="row-meta">
								{n.channel.toUpperCase()} ·{" "}
								{new Date(n.createdAt).toLocaleString()}{" "}
								{n.to ? `· to ${n.to}` : ""}
							</Text>
						</Box>
						<Box className={`row-status status-${n.status}`}>
							{n.status}
						</Box>
					</Box>
				))}
			</Box>
		</NotificationsWrapperStyled>
	);
}

export default memo(NotificationsWrapper);
