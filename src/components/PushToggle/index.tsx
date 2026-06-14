"use client";
import { useEffect, useState } from "react";
import { FiBell, FiBellOff, FiDownload } from "react-icons/fi";
import usePush from "@/hooks/usePush";
import { useToast } from "@/hooks/useToast";
import Box from "../Box";
import Button from "../Button";

interface IPromptable extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * User-facing control to enable/disable browser push notifications and to
 * install the app (PWA). Hides itself entirely when the browser can't do push.
 */
export default function PushToggle() {
	const toast = useToast();
	const { supported, subscribed, loading, enable, disable } = usePush();
	const [installable, setInstallable] = useState(false);

	useEffect(() => {
		const onInstallable = () => setInstallable(true);
		const onInstalled = () => setInstallable(false);
		window.addEventListener("pwa-installable", onInstallable);
		window.addEventListener("appinstalled", onInstalled);
		if (
			(window as unknown as { __deferredInstallPrompt?: Event })
				.__deferredInstallPrompt
		) {
			setInstallable(true);
		}
		return () => {
			window.removeEventListener("pwa-installable", onInstallable);
			window.removeEventListener("appinstalled", onInstalled);
		};
	}, []);

	const handleToggle = async () => {
		if (subscribed) {
			const okDone = await disable();
			if (okDone)
				toast.push("Push notifications turned off", { type: "info" });
		} else {
			const okDone = await enable();
			toast.push(
				okDone
					? "Push notifications enabled"
					: "Couldn't enable notifications",
				{ type: okDone ? "success" : "warn" },
			);
		}
	};

	const handleInstall = async () => {
		const w = window as unknown as {
			__deferredInstallPrompt?: IPromptable;
		};
		const prompt = w.__deferredInstallPrompt;
		if (!prompt) return;
		await prompt.prompt();
		const choice = await prompt.userChoice;
		if (choice.outcome === "accepted") {
			toast.push("App installed", { type: "success" });
			setInstallable(false);
		}
		w.__deferredInstallPrompt = undefined;
	};

	if (!supported && !installable) return null;

	return (
		<Box style={{ display: "inline-flex", gap: 8 }}>
			{installable ? (
				<Button
					type="button"
					variant="ghost"
					title={
						<Box
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
							}}
						>
							<FiDownload size={14} />
							<span>Install app</span>
						</Box>
					}
					handleClick={handleInstall}
				/>
			) : null}
			{supported ? (
				<Button
					type="button"
					variant={subscribed ? "ghost" : "soft"}
					disabled={loading}
					title={
						<Box
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
							}}
						>
							{subscribed ? (
								<FiBellOff size={14} />
							) : (
								<FiBell size={14} />
							)}
							<span>
								{subscribed
									? "Disable alerts"
									: "Enable alerts"}
							</span>
						</Box>
					}
					handleClick={handleToggle}
				/>
			) : null}
		</Box>
	);
}
