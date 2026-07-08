import { describe, expect, it, vi } from "vitest";
import type { Transport } from "../../../src/server/services/notifications/dispatch";

// Load transports.ts with NO provider credentials so EMAIL_ENABLED /
// SMS_ENABLED compute to false at module load. We then capture the transport
// it installs and invoke it directly, which exercises the stdout-fallback
// branches (and the default/unknown-channel branch) without touching the DB.

const postMock = vi.hoisted(() => vi.fn());
vi.mock("axios", () => ({ default: { post: postMock }, post: postMock }));

// Mock the dispatch module so configureNotificationTransport hands us the
// transport function directly. transports.ts imports ONLY from ./dispatch and
// axios, so this keeps the whole test self-contained (no src graph, no Mongo).
const setTransportMock = vi.hoisted(() => vi.fn());
vi.mock("../../../src/server/services/notifications/dispatch", () => ({
	setNotificationTransport: setTransportMock,
}));

// Strip provider env BEFORE transports.ts is evaluated.
vi.hoisted(() => {
	for (const key of [
		"RESEND_API_KEY",
		"EMAIL_FROM",
		"TWILIO_ACCOUNT_SID",
		"TWILIO_AUTH_TOKEN",
		"TWILIO_SMS_FROM",
		"TWILIO_WHATSAPP_FROM",
	]) {
		delete process.env[key];
	}
});

const { configureNotificationTransport } = await import(
	"../../../src/server/services/notifications/transports"
);

function getTransport(): Transport {
	configureNotificationTransport();
	const transport = setTransportMock.mock.calls.at(-1)?.[0] as
		| Transport
		| undefined;
	if (!transport) throw new Error("transport was not installed");
	return transport;
}

describe("notification transports (providers unconfigured → stdout fallback)", () => {
	it("logs email to stdout and reports success without hitting Resend", async () => {
		const transport = getTransport();
		await expect(
			transport({
				channel: "email",
				to: "owner@example.test",
				title: "Subject",
				body: "Body",
			}),
		).resolves.toEqual({ ok: true, channel: "email" });
		expect(postMock).not.toHaveBeenCalled();
	});

	it("logs sms to stdout and reports success without hitting Twilio", async () => {
		const transport = getTransport();
		await expect(
			transport({
				channel: "sms",
				to: "+2348010000000",
				title: "Rent due",
				body: "Pay up",
			}),
		).resolves.toEqual({ ok: true, channel: "sms" });
		expect(postMock).not.toHaveBeenCalled();
	});

	it("logs whatsapp to stdout and reports success without hitting Twilio", async () => {
		const transport = getTransport();
		await expect(
			transport({
				channel: "whatsapp",
				to: "+2348020000000",
				title: "Hi",
				body: "There",
			}),
		).resolves.toEqual({ ok: true, channel: "whatsapp" });
		expect(postMock).not.toHaveBeenCalled();
	});

	it("still refuses email/sms with no recipient", async () => {
		const transport = getTransport();
		await expect(
			transport({ channel: "email", title: "t", body: "b" }),
		).resolves.toMatchObject({ ok: false, channel: "email" });
		await expect(
			transport({ channel: "sms", title: "t", body: "b" }),
		).resolves.toMatchObject({ ok: false, channel: "sms" });
	});

	it("falls through to the stdout default for an unknown channel", async () => {
		const transport = getTransport();
		await expect(
			transport({
				// Channel outside the email/sms/whatsapp switch cases.
				channel: "push" as never,
				to: "someone",
				title: "t",
				body: "b",
			}),
		).resolves.toEqual({ ok: true, channel: "push" });
		expect(postMock).not.toHaveBeenCalled();
	});
});
