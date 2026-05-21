"use client";
import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/constants";
import type { INotificationRow } from "./useNotifications";

interface IUnreadResponse {
	data?: {
		unread: number;
		recent: INotificationRow[];
	};
}

export default function useNotificationsUnread() {
	const { data, mutate, isLoading } = useSWR<IUnreadResponse>(
		"/api/notifications/unread",
		fetcher,
		{
			revalidateOnMount: true,
			refreshInterval: 30_000,
		},
	);

	const unread = data?.data?.unread ?? 0;
	const recent = useMemo<INotificationRow[]>(
		() => data?.data?.recent ?? [],
		[data],
	);

	return { unread, recent, isLoading, mutate };
}
