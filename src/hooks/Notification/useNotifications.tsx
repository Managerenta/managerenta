"use client";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { api, fetcher } from "@/constants";

export interface INotificationRow {
	_id: string;
	channel: "email" | "sms" | "whatsapp" | "in-app";
	kind:
		| "rent-due"
		| "rent-overdue"
		| "payment-received"
		| "lease-expiry"
		| "tenant-move-in"
		| "tenant-move-out"
		| "org-invite"
		| "email-verification"
		| "password-reset"
		| "system";
	title: string;
	body: string;
	to?: string;
	status: "queued" | "sent" | "failed" | "read";
	createdAt: string;
	sentAt?: string;
	readAt?: string;
}

interface IListResponse {
	data?: {
		data: INotificationRow[];
		total: number;
		unread: number;
	};
}

export default function useNotifications({
	limit = 50,
}: {
	limit?: number;
} = {}) {
	const url = `/api/notifications?limit=${limit}`;
	const { data, mutate, isLoading } = useSWR<IListResponse>(url, fetcher, {
		revalidateOnMount: true,
		refreshInterval: 60_000,
	});

	const rows = useMemo<INotificationRow[]>(
		() => data?.data?.data ?? [],
		[data],
	);
	const total = data?.data?.total ?? 0;
	const unread = data?.data?.unread ?? 0;

	const markRead = useCallback(
		async (id: string) => {
			await api().post(`/api/notifications/${id}/read`, {});
			await mutate();
		},
		[mutate],
	);

	const markAllRead = useCallback(async () => {
		await api().post("/api/notifications/read-all", {});
		await mutate();
	}, [mutate]);

	const remove = useCallback(
		async (id: string) => {
			await api().delete(`/api/notifications/${id}`);
			await mutate();
		},
		[mutate],
	);

	return {
		rows,
		total,
		unread,
		isLoading,
		mutate,
		markRead,
		markAllRead,
		remove,
	};
}
