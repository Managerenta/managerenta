import { createNotificationDB } from "../../models";
import type {
	INotificationChannel,
	INotificationCreateInput,
	INotificationKind,
} from "../../models/notifications/types";

// Pluggable transport interface. Real providers (Resend, Sendgrid, Twilio,
// WhatsApp Business, web-push) plug in by exporting a Transport.
// The default transport just logs to stdout and marks the notification as sent,
// which is the right behaviour for development and for environments where
// outbound delivery hasn't been provisioned yet.

export type DispatchResult = {
	ok: boolean;
	channel: INotificationChannel;
	error?: string;
};

export type Transport = (args: {
	channel: INotificationChannel;
	to?: string;
	title: string;
	body: string;
	meta?: Record<string, unknown>;
}) => Promise<DispatchResult>;

let transportImpl: Transport = async ({ channel, to, title }) => {
	console.log(
		`[notification:${channel}] -> ${to ?? "<no-recipient>"} :: ${title}`,
	);
	return { ok: true, channel };
};

export function setNotificationTransport(t: Transport): void {
	transportImpl = t;
}

/**
 * Best-effort mirror of an in-app notification to the user's subscribed
 * browsers. Imported lazily so the web-push dependency only loads when a
 * notification is actually dispatched. Never throws.
 */
async function mirrorToWebPush(args: SendNotificationArgs): Promise<void> {
	try {
		const { sendWebPushToUser } = await import("../push");
		await sendWebPushToUser({
			userId: args.userId,
			title: args.title,
			body: args.body,
			url: "/notifications",
		});
	} catch {
		// push mirroring must never break notification delivery
	}
}

export interface SendNotificationArgs {
	userId: string;
	tenantId?: string;
	organizationId?: string;
	channels: INotificationChannel[];
	kind: INotificationKind;
	title: string;
	body: string;
	to?: string;
	meta?: Record<string, unknown>;
}

export async function sendNotification(args: SendNotificationArgs): Promise<{
	sent: number;
	failed: number;
	notifications: ReturnType<typeof createNotificationDB>[];
}> {
	const channels: INotificationChannel[] = args.channels.length
		? args.channels
		: ["in-app"];
	const results = await Promise.all(
		channels.map(async (channel) => {
			const payload: INotificationCreateInput = {
				userId: args.userId,
				tenantId: args.tenantId,
				organizationId: args.organizationId,
				channel,
				kind: args.kind,
				title: args.title,
				body: args.body,
				to: args.to,
				meta: args.meta,
			};

			// in-app notifications are persisted only — no transport dispatch.
			// We also mirror them to the browser via web-push (no-op when the
			// user has no push subscriptions or VAPID keys aren't configured).
			if (channel === "in-app") {
				const doc = await createNotificationDB({
					...payload,
					status: "sent",
				});
				void mirrorToWebPush(args);
				return { doc, ok: !!doc };
			}

			try {
				const transport = transportImpl;
				const result = await transport({
					channel,
					to: args.to,
					title: args.title,
					body: args.body,
					meta: args.meta,
				});
				const doc = await createNotificationDB({
					...payload,
					status: result.ok ? "sent" : "failed",
				});
				return { doc, ok: result.ok };
			} catch (error) {
				const doc = await createNotificationDB({
					...payload,
					status: "failed",
				});
				return { doc, ok: false, error };
			}
		}),
	);

	const sent = results.filter((r) => r.ok).length;
	const failed = results.length - sent;
	return {
		sent,
		failed,
		notifications: results.map((r) => Promise.resolve(r.doc)),
	};
}
