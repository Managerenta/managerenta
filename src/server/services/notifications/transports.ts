import axios from "axios";
import type { DispatchResult, Transport } from "./dispatch";
import { setNotificationTransport } from "./dispatch";

/**
 * Concrete notification transports. These activate automatically when the
 * relevant provider credentials are present in the environment; otherwise the
 * default stdout transport (see ./dispatch) stays in place.
 *
 * - Email  -> Resend (https://resend.com) HTTP API
 * - SMS    -> Twilio (https://twilio.com) HTTP API
 * - WhatsApp -> Twilio WhatsApp sender (same API, `whatsapp:` prefix)
 *
 * Everything is done over plain HTTPS with `axios` (already a dependency) so no
 * new provider SDKs are required.
 */

const EMAIL_ENABLED = !!process.env.RESEND_API_KEY;
const SMS_ENABLED = !!(
	process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
);

async function sendEmail({
	to,
	title,
	body,
}: {
	to?: string;
	title: string;
	body: string;
}): Promise<DispatchResult> {
	if (!to) return { ok: false, channel: "email", error: "No recipient" };
	if (!EMAIL_ENABLED) {
		console.log(`[notification:email] -> ${to} :: ${title}`);
		return { ok: true, channel: "email" };
	}
	try {
		await axios.post(
			"https://api.resend.com/emails",
			{
				from:
					process.env.EMAIL_FROM ??
					"Managerenta <no-reply@managerenta.com>",
				to: [to],
				subject: title,
				text: body,
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
					"Content-Type": "application/json",
				},
				timeout: 10_000,
			},
		);
		return { ok: true, channel: "email" };
	} catch (error) {
		return {
			ok: false,
			channel: "email",
			error: error instanceof Error ? error.message : "Email send failed",
		};
	}
}

async function sendTwilioMessage({
	channel,
	to,
	body,
}: {
	channel: "sms" | "whatsapp";
	to?: string;
	body: string;
}): Promise<DispatchResult> {
	if (!to) return { ok: false, channel, error: "No recipient" };
	if (!SMS_ENABLED) {
		console.log(`[notification:${channel}] -> ${to} :: ${body}`);
		return { ok: true, channel };
	}
	const sid = process.env.TWILIO_ACCOUNT_SID as string;
	const from =
		channel === "whatsapp"
			? `whatsapp:${process.env.TWILIO_WHATSAPP_FROM ?? ""}`
			: (process.env.TWILIO_SMS_FROM ?? "");
	const recipient = channel === "whatsapp" ? `whatsapp:${to}` : to;
	try {
		const form = new URLSearchParams({
			To: recipient,
			From: from,
			Body: body,
		});
		await axios.post(
			`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
			form.toString(),
			{
				auth: {
					username: sid,
					password: process.env.TWILIO_AUTH_TOKEN as string,
				},
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				timeout: 10_000,
			},
		);
		return { ok: true, channel };
	} catch (error) {
		return {
			ok: false,
			channel,
			error:
				error instanceof Error ? error.message : "Message send failed",
		};
	}
}

const transport: Transport = async ({ channel, to, title, body }) => {
	switch (channel) {
		case "email":
			return sendEmail({ to, title, body });
		case "sms":
			return sendTwilioMessage({
				channel: "sms",
				to,
				body: `${title}\n${body}`,
			});
		case "whatsapp":
			return sendTwilioMessage({
				channel: "whatsapp",
				to,
				body: `${title}\n${body}`,
			});
		default:
			console.log(
				`[notification:${channel}] -> ${to ?? "<no-recipient>"} :: ${title}`,
			);
			return { ok: true, channel };
	}
};

/**
 * Install the real notification transport. Called once during bootstrap.
 * Safe to call when no providers are configured — individual channels fall
 * back to stdout logging so development behaviour is unchanged.
 */
export function configureNotificationTransport(): void {
	setNotificationTransport(transport);
	if (EMAIL_ENABLED || SMS_ENABLED) {
		console.log(
			`[notifications] transport configured (email=${EMAIL_ENABLED}, sms/whatsapp=${SMS_ENABLED})`,
		);
	}
}
