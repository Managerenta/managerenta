import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { Notification } from "../../../src/server/models/notifications";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import { newId } from "../../helpers/seed";

// Mock the only true external: provider HTTP calls via axios.
const postMock = vi.hoisted(() =>
	vi.fn(async (_url?: any, _data?: any, _config?: any) => ({ data: { id: "x" } })),
);
vi.mock("axios", () => ({
	default: { post: postMock },
	post: postMock,
}));

// Provider credentials must exist BEFORE the transports module is imported —
// EMAIL_ENABLED / SMS_ENABLED are computed at module load, and transports.ts
// is reached transitively from `constants` (via cron.ts → services) as soon
// as any src import runs. vi.hoisted executes ahead of every import.
vi.hoisted(() => {
	process.env.RESEND_API_KEY = "re_vitest_fake_key";
	process.env.TWILIO_ACCOUNT_SID = "ACvitestfake";
	process.env.TWILIO_AUTH_TOKEN = "vitest-twilio-token";
	process.env.TWILIO_SMS_FROM = "+15550000001";
	process.env.EMAIL_FROM = "Vitest <vitest@managerenta.test>";
});

const { configureNotificationTransport } = await import(
	"../../../src/server/services/notifications/transports"
);
const { sendNotification } = await import(
	"../../../src/server/services/notifications/dispatch"
);

describe("notification transports (Resend / Twilio HTTP mocked)", () => {
	beforeAll(async () => {
		await connectTestDB();
		configureNotificationTransport();
	});

	beforeEach(async () => {
		await clearTestDB();
		postMock.mockClear();
		postMock.mockResolvedValue({ data: { id: "x" } });
	});

	afterAll(async () => {
		await clearTestDB();
	});

	it("delivers email via the Resend API and records the notification as sent", async () => {
		const userId = newId();
		const result = await sendNotification({
			userId,
			channels: ["email"],
			kind: "system",
			title: "Subject line",
			body: "Email body",
			to: "recipient@example.test",
		});

		expect(result.sent).toBe(1);
		expect(postMock).toHaveBeenCalledTimes(1);
		const [url, payload, config] = postMock.mock.calls[0];
		expect(url).toBe("https://api.resend.com/emails");
		expect(payload).toMatchObject({
			to: ["recipient@example.test"],
			subject: "Subject line",
			text: "Email body",
			from: "Vitest <vitest@managerenta.test>",
		});
		expect(config.headers.Authorization).toBe(
			"Bearer re_vitest_fake_key",
		);

		const doc = await Notification.findOne({ userId }).lean();
		expect(doc?.status).toBe("sent");
		expect(doc?.channel).toBe("email");
	});

	it("delivers sms via the Twilio API with form-encoded body", async () => {
		const userId = newId();
		await sendNotification({
			userId,
			channels: ["sms"],
			kind: "rent-due",
			title: "Rent due",
			body: "Pay up please",
			to: "+2348012345678",
		});

		expect(postMock).toHaveBeenCalledTimes(1);
		const [url, form, config] = postMock.mock.calls[0];
		expect(url).toBe(
			"https://api.twilio.com/2010-04-01/Accounts/ACvitestfake/Messages.json",
		);
		const params = new URLSearchParams(form);
		expect(params.get("To")).toBe("+2348012345678");
		expect(params.get("From")).toBe("+15550000001");
		expect(params.get("Body")).toBe("Rent due\nPay up please");
		expect(config.auth).toEqual({
			username: "ACvitestfake",
			password: "vitest-twilio-token",
		});

		const doc = await Notification.findOne({ userId }).lean();
		expect(doc?.status).toBe("sent");
	});

	it("prefixes whatsapp recipients and sender", async () => {
		process.env.TWILIO_WHATSAPP_FROM = "+15550000002";
		const userId = newId();
		await sendNotification({
			userId,
			channels: ["whatsapp"],
			kind: "system",
			title: "Hi",
			body: "There",
			to: "+2348098765432",
		});

		const [, form] = postMock.mock.calls[0];
		const params = new URLSearchParams(form);
		expect(params.get("To")).toBe("whatsapp:+2348098765432");
		expect(params.get("From")).toBe("whatsapp:+15550000002");
	});

	it("marks the notification failed when the provider call rejects", async () => {
		postMock.mockRejectedValueOnce(new Error("resend 500"));
		const userId = newId();
		const result = await sendNotification({
			userId,
			channels: ["email"],
			kind: "system",
			title: "Doomed email",
			body: "Body",
			to: "recipient@example.test",
		});

		expect(result.failed).toBe(1);
		const doc = await Notification.findOne({ userId }).lean();
		expect(doc?.status).toBe("failed");
	});

	it("marks an sms failed when the Twilio call rejects", async () => {
		postMock.mockRejectedValueOnce(new Error("twilio 401"));
		const userId = newId();
		const result = await sendNotification({
			userId,
			channels: ["sms"],
			kind: "rent-due",
			title: "Rent due",
			body: "Pay up",
			to: "+2348012345678",
		});

		expect(result.failed).toBe(1);
		expect(result.sent).toBe(0);
		const doc = await Notification.findOne({ userId }).lean();
		expect(doc?.status).toBe("failed");
		expect(doc?.channel).toBe("sms");
	});

	it("fails fast without a recipient and never calls the provider", async () => {
		const userId = newId();
		const result = await sendNotification({
			userId,
			channels: ["email"],
			kind: "system",
			title: "No recipient",
			body: "Body",
		});

		expect(result.failed).toBe(1);
		expect(postMock).not.toHaveBeenCalled();
		const doc = await Notification.findOne({ userId }).lean();
		expect(doc?.status).toBe("failed");
	});
});
