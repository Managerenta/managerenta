"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/constants";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/-/g, "+")
		.replace(/_/g, "/");
	const raw = atob(base64);
	const buffer = new ArrayBuffer(raw.length);
	const out = new Uint8Array(buffer);
	for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
	return out;
}

interface IPushState {
	supported: boolean;
	permission: NotificationPermission | "default";
	subscribed: boolean;
	loading: boolean;
}

/**
 * Client hook to manage web-push: ensures the service worker is registered,
 * reports subscription state and exposes enable()/disable().
 */
export default function usePush() {
	const [state, setState] = useState<IPushState>({
		supported: false,
		permission: "default",
		subscribed: false,
		loading: true,
	});

	useEffect(() => {
		const supported =
			typeof window !== "undefined" &&
			"serviceWorker" in navigator &&
			"PushManager" in window &&
			"Notification" in window;
		if (!supported) {
			setState((s) => ({ ...s, supported: false, loading: false }));
			return;
		}
		(async () => {
			try {
				const reg = await navigator.serviceWorker.ready;
				const sub = await reg.pushManager.getSubscription();
				setState({
					supported: true,
					permission: Notification.permission,
					subscribed: !!sub,
					loading: false,
				});
			} catch {
				setState((s) => ({
					...s,
					supported: true,
					loading: false,
				}));
			}
		})();
	}, []);

	const enable = useCallback(async (): Promise<boolean> => {
		try {
			setState((s) => ({ ...s, loading: true }));
			const permission = await Notification.requestPermission();
			if (permission !== "granted") {
				setState((s) => ({ ...s, permission, loading: false }));
				return false;
			}

			const { data } = await api().get("/api/push/vapid");
			const publicKey: string | null = data?.data?.publicKey ?? null;
			if (!publicKey) {
				setState((s) => ({ ...s, permission, loading: false }));
				return false;
			}

			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(publicKey),
			});
			await api().post("/api/push/subscribe", {
				subscription: sub.toJSON(),
			});
			setState({
				supported: true,
				permission: "granted",
				subscribed: true,
				loading: false,
			});
			return true;
		} catch {
			setState((s) => ({ ...s, loading: false }));
			return false;
		}
	}, []);

	const disable = useCallback(async (): Promise<boolean> => {
		try {
			setState((s) => ({ ...s, loading: true }));
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				await api().delete("/api/push/subscribe", {
					data: { endpoint: sub.endpoint },
				});
				await sub.unsubscribe();
			}
			setState((s) => ({ ...s, subscribed: false, loading: false }));
			return true;
		} catch {
			setState((s) => ({ ...s, loading: false }));
			return false;
		}
	}, []);

	return { ...state, enable, disable };
}
