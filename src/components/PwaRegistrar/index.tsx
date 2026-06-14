"use client";
import { useEffect } from "react";

/**
 * Registers the service worker (for web-push + installability) and stashes the
 * deferred install prompt so an "Install app" button can trigger it later.
 * Renders nothing.
 */
export default function PwaRegistrar() {
	useEffect(() => {
		if (typeof window === "undefined") return;
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.register("/sw.js").catch(() => {
				// registration failures are non-fatal
			});
		}

		const onBeforeInstall = (e: Event) => {
			e.preventDefault();
			(
				window as unknown as { __deferredInstallPrompt?: Event }
			).__deferredInstallPrompt = e;
			window.dispatchEvent(new Event("pwa-installable"));
		};
		window.addEventListener("beforeinstallprompt", onBeforeInstall);
		return () =>
			window.removeEventListener("beforeinstallprompt", onBeforeInstall);
	}, []);

	return null;
}
