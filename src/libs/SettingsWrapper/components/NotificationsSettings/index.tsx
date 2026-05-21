"use client";
import { memo, useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { Box, Text } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import { NotificationsSettingsStyled } from "./styled";

interface NotificationsState {
	emailEnabled: boolean;
	smsEnabled: boolean;
	pushEnabled: boolean;
	paymentReceived: boolean;
	paymentOverdue: boolean;
	tenantMoveIn: boolean;
	tenantMoveOut: boolean;
	leaseExpiry: boolean;
}

const DEFAULTS: NotificationsState = {
	emailEnabled: true,
	smsEnabled: false,
	pushEnabled: false,
	paymentReceived: true,
	paymentOverdue: true,
	tenantMoveIn: true,
	tenantMoveOut: true,
	leaseExpiry: true,
};

const CHANNELS: {
	key: keyof NotificationsState;
	label: string;
	desc: string;
}[] = [
	{
		key: "emailEnabled",
		label: "Email notifications",
		desc: "Receive notifications by email at the address on your profile.",
	},
	{
		key: "smsEnabled",
		label: "SMS notifications",
		desc: "Receive notifications by text message at your verified phone.",
	},
	{
		key: "pushEnabled",
		label: "Push notifications",
		desc: "Show desktop or mobile push notifications.",
	},
];

const EVENTS: { key: keyof NotificationsState; label: string; desc: string }[] =
	[
		{
			key: "paymentReceived",
			label: "Payment received",
			desc: "When a tenant records a payment.",
		},
		{
			key: "paymentOverdue",
			label: "Payment overdue",
			desc: "When a tenant's rent crosses its due date.",
		},
		{
			key: "tenantMoveIn",
			label: "Tenant move-in",
			desc: "When a new tenant is added to a unit.",
		},
		{
			key: "tenantMoveOut",
			label: "Tenant move-out",
			desc: "When a tenant is removed or marked inactive.",
		},
		{
			key: "leaseExpiry",
			label: "Lease expiring",
			desc: "Heads-up when a lease is about to expire.",
		},
	];

function NotificationsSettings() {
	const toast = useToast();
	const { data, mutate, isLoading } = useSWR<{
		data?: { notifications?: NotificationsState };
	}>("/api/users/user-profile", fetcher, { revalidateOnMount: true });

	const [state, setState] = useState<NotificationsState>(DEFAULTS);
	const [saving, setSaving] = useState<keyof NotificationsState | null>(null);

	useEffect(() => {
		if (data?.data?.notifications) {
			setState({ ...DEFAULTS, ...data.data.notifications });
		}
	}, [data]);

	const toggle = useCallback(
		async (key: keyof NotificationsState) => {
			const next = { ...state, [key]: !state[key] };
			setState(next);
			setSaving(key);
			try {
				await api().patch("/api/users/notifications", {
					[key]: next[key],
				});
				await mutate();
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed to save"), {
					type: "warn",
				});
				setState(state);
			} finally {
				setSaving(null);
			}
		},
		[state, mutate, toast],
	);

	const Toggle = ({ k }: { k: keyof NotificationsState }) => (
		<Box
			className={`toggle-switch ${state[k] ? "active" : ""} ${
				saving === k ? "saving" : ""
			}`}
			role="switch"
			aria-checked={state[k]}
			aria-disabled={saving !== null}
			onClick={() => saving === null && toggle(k)}
		>
			<Box className="toggle-thumb" />
		</Box>
	);

	return (
		<NotificationsSettingsStyled>
			<Box className="section">
				<Text className="section-title">Channels</Text>
				{CHANNELS.map(({ key, label, desc }) => (
					<Box key={key} className="row">
						<Box className="row-text">
							<Text className="row-label">{label}</Text>
							<Text className="row-desc">{desc}</Text>
						</Box>
						<Toggle k={key} />
					</Box>
				))}
			</Box>

			<Box className="section">
				<Text className="section-title">Events</Text>
				{EVENTS.map(({ key, label, desc }) => (
					<Box key={key} className="row">
						<Box className="row-text">
							<Text className="row-label">{label}</Text>
							<Text className="row-desc">{desc}</Text>
						</Box>
						<Toggle k={key} />
					</Box>
				))}
			</Box>

			{isLoading && <Text className="loading-hint">Loading…</Text>}
		</NotificationsSettingsStyled>
	);
}

export default memo(NotificationsSettings);
