import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { PushSubscription } from "../../../src/server/models/pushSubscriptions";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import { newId } from "../../helpers/seed";

// web-push performs real HTTP + VAPID crypto → mock it wholesale.
const sendNotificationMock = vi.hoisted(() =>
	vi.fn(async (_sub?: any, _payload?: any) => ({})),
);
const setVapidDetailsMock = vi.hoisted(() => vi.fn());
vi.mock("web-push", () => ({
	default: {
		sendNotification: sendNotificationMock,
		setVapidDetails: setVapidDetailsMock,
	},
}));

// VAPID env must be set before the service caches its configured flag.
process.env.VAPID_PUBLIC_KEY = "vitest-public-key";
process.env.VAPID_PRIVATE_KEY = "vitest-private-key";

const {
	getVapidPublicKey,
	isWebPushConfigured,
	removeSubscription,
	saveSubscription,
	sendWebPushToUser,
} = await import("../../../src/server/services/push");

function subscription(endpoint: string) {
	return {
		endpoint,
		keys: { p256dh: `p256dh-${endpoint}`, auth: `auth-${endpoint}` },
	};
}

describe("push service (web-push mocked)", () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	beforeEach(async () => {
		await clearTestDB();
		sendNotificationMock.mockClear();
		sendNotificationMock.mockResolvedValue({});
	});

	afterAll(async () => {
		await clearTestDB();
	});

	it("reports configuration from VAPID env", () => {
		expect(getVapidPublicKey()).toBe("vitest-public-key");
		expect(isWebPushConfigured()).toBe(true);
		expect(setVapidDetailsMock).toHaveBeenCalledWith(
			"mailto:no-reply@managerenta.com",
			"vitest-public-key",
			"vitest-private-key",
		);
	});

	describe("saveSubscription", () => {
		it("upserts by endpoint — the same endpoint never duplicates", async () => {
			const userId = newId();
			const endpoint = `https://push.example/ep-${Date.now()}`;

			expect(
				await saveSubscription({
					userId,
					subscription: subscription(endpoint),
					userAgent: "vitest-agent",
				}),
			).toBe(true);

			// Re-subscribe with rotated keys → single doc, updated keys.
			expect(
				await saveSubscription({
					userId,
					subscription: {
						endpoint,
						keys: { p256dh: "rotated-p", auth: "rotated-a" },
					},
				}),
			).toBe(true);

			const docs = await PushSubscription.find({ endpoint }).lean();
			expect(docs).toHaveLength(1);
			expect(docs[0].p256dh).toBe("rotated-p");
			expect(docs[0].auth).toBe("rotated-a");
			expect(docs[0].userId).toBe(userId);
		});

		it("rejects malformed subscriptions", async () => {
			expect(
				await saveSubscription({
					userId: newId(),
					subscription: { endpoint: "", keys: null } as never,
				}),
			).toBe(false);
		});
	});

	describe("removeSubscription", () => {
		it("removes only the caller's subscription for the endpoint", async () => {
			const userId = newId();
			const endpoint = `https://push.example/ep-rm-${Date.now()}`;
			await saveSubscription({
				userId,
				subscription: subscription(endpoint),
			});

			// Wrong user: delete filter finds nothing but resolves true (the
			// deleteOne API is idempotent); doc must survive.
			await removeSubscription({ userId: newId(), endpoint });
			expect(
				await PushSubscription.countDocuments({ endpoint }),
			).toBe(1);

			await removeSubscription({ userId, endpoint });
			expect(
				await PushSubscription.countDocuments({ endpoint }),
			).toBe(0);
		});
	});

	describe("sendWebPushToUser", () => {
		it("pushes to every subscription and prunes 404/410 endpoints", async () => {
			const userId = newId();
			const ok = `https://push.example/ok-${Date.now()}`;
			const gone = `https://push.example/gone-${Date.now()}`;
			const notFound = `https://push.example/404-${Date.now()}`;
			for (const ep of [ok, gone, notFound]) {
				await saveSubscription({
					userId,
					subscription: subscription(ep),
				});
			}

			sendNotificationMock.mockImplementation(
				async (sub: { endpoint: string }) => {
					if (sub.endpoint === gone) {
						const err = new Error("gone") as Error & {
							statusCode: number;
						};
						err.statusCode = 410;
						throw err;
					}
					if (sub.endpoint === notFound) {
						const err = new Error("nf") as Error & {
							statusCode: number;
						};
						err.statusCode = 404;
						throw err;
					}
					return {};
				},
			);

			const result = await sendWebPushToUser({
				userId,
				title: "Ping",
				body: "Pong",
				url: "/somewhere",
			});

			expect(result).toEqual({ sent: 1, pruned: 2 });
			expect(sendNotificationMock).toHaveBeenCalledTimes(3);

			// Payload carries title/body/url as JSON.
			const okCall = sendNotificationMock.mock.calls.find(
				(c) => c[0].endpoint === ok,
			);
			expect(JSON.parse(okCall?.[1] as string)).toEqual({
				title: "Ping",
				body: "Pong",
				url: "/somewhere",
			});

			// Expired endpoints were deleted; healthy one survives.
			const remaining = await PushSubscription.find({ userId }).lean();
			expect(remaining.map((d) => d.endpoint)).toEqual([ok]);
		});

		it("does not prune on transient errors (e.g. 500)", async () => {
			const userId = newId();
			const flaky = `https://push.example/flaky-${Date.now()}`;
			await saveSubscription({
				userId,
				subscription: subscription(flaky),
			});
			sendNotificationMock.mockRejectedValueOnce(
				Object.assign(new Error("server error"), { statusCode: 500 }),
			);

			const result = await sendWebPushToUser({
				userId,
				title: "T",
				body: "B",
			});
			expect(result).toEqual({ sent: 0, pruned: 0 });
			expect(
				await PushSubscription.countDocuments({ userId }),
			).toBe(1);
		});

		it("returns zeros for a user with no subscriptions", async () => {
			const result = await sendWebPushToUser({
				userId: newId(),
				title: "T",
				body: "B",
			});
			expect(result).toEqual({ sent: 0, pruned: 0 });
			expect(sendNotificationMock).not.toHaveBeenCalled();
		});
	});
});

describe("push service without VAPID keys", () => {
	it("is a no-op when web-push is not configured", async () => {
		vi.resetModules();
		const savedPub = process.env.VAPID_PUBLIC_KEY;
		const savedPriv = process.env.VAPID_PRIVATE_KEY;
		delete process.env.VAPID_PUBLIC_KEY;
		delete process.env.VAPID_PRIVATE_KEY;
		try {
			const fresh = await import(
				"../../../src/server/services/push"
			);
			expect(fresh.isWebPushConfigured()).toBe(false);
			expect(fresh.getVapidPublicKey()).toBeNull();
			const result = await fresh.sendWebPushToUser({
				userId: newId(),
				title: "T",
				body: "B",
			});
			expect(result).toEqual({ sent: 0, pruned: 0 });
		} finally {
			process.env.VAPID_PUBLIC_KEY = savedPub;
			process.env.VAPID_PRIVATE_KEY = savedPriv;
		}
	});
});
