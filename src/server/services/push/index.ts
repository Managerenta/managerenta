import "server-only";
import webpush from "web-push";
import {
	deletePushSubscriptionByEndpointDB,
	getPushSubscriptionsByUserDB,
	upsertPushSubscriptionDB,
} from "../../models";

let configured: boolean | null = null;

/** Lazily configure web-push from VAPID env vars. Returns false when unset. */
function ensureConfigured(): boolean {
	if (configured !== null) return configured;
	const publicKey = process.env.VAPID_PUBLIC_KEY;
	const privateKey = process.env.VAPID_PRIVATE_KEY;
	if (!publicKey || !privateKey) {
		configured = false;
		return false;
	}
	try {
		webpush.setVapidDetails(
			process.env.VAPID_SUBJECT ?? "mailto:no-reply@managerenta.com",
			publicKey,
			privateKey,
		);
		configured = true;
	} catch {
		configured = false;
	}
	return configured;
}

export function getVapidPublicKey(): string | null {
	return process.env.VAPID_PUBLIC_KEY ?? null;
}

export function isWebPushConfigured(): boolean {
	return ensureConfigured();
}

export async function saveSubscription({
	userId,
	subscription,
	userAgent,
}: {
	userId: string;
	subscription: {
		endpoint: string;
		keys: { p256dh: string; auth: string };
	};
	userAgent?: string;
}): Promise<boolean> {
	if (!subscription?.endpoint || !subscription.keys?.p256dh) return false;
	return upsertPushSubscriptionDB({
		payload: {
			userId,
			endpoint: subscription.endpoint,
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth,
			userAgent,
		},
	});
}

export async function removeSubscription({
	userId,
	endpoint,
}: {
	userId: string;
	endpoint: string;
}): Promise<boolean> {
	return deletePushSubscriptionByEndpointDB({ endpoint, userId });
}

/**
 * Push a notification to every browser the user has subscribed. Fire-and-forget
 * friendly: never throws, and prunes subscriptions the push service has expired
 * (404 / 410). No-op when VAPID keys aren't configured.
 */
export async function sendWebPushToUser({
	userId,
	title,
	body,
	url,
}: {
	userId: string;
	title: string;
	body: string;
	url?: string;
}): Promise<{ sent: number; pruned: number }> {
	if (!ensureConfigured()) return { sent: 0, pruned: 0 };

	const subs = await getPushSubscriptionsByUserDB({ userId });
	if (!subs.length) return { sent: 0, pruned: 0 };

	const payload = JSON.stringify({
		title,
		body,
		url: url ?? "/notifications",
	});
	let sent = 0;
	let pruned = 0;

	await Promise.all(
		subs.map(async (s) => {
			try {
				await webpush.sendNotification(
					{
						endpoint: s.endpoint,
						keys: { p256dh: s.p256dh, auth: s.auth },
					},
					payload,
				);
				sent += 1;
			} catch (error) {
				const statusCode = (error as { statusCode?: number })
					?.statusCode;
				if (statusCode === 404 || statusCode === 410) {
					await deletePushSubscriptionByEndpointDB({
						endpoint: s.endpoint,
					});
					pruned += 1;
				}
			}
		}),
	);

	return { sent, pruned };
}
