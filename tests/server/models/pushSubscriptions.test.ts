import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

import {
	deletePushSubscriptionByEndpointDB,
	getPushSubscriptionsByUserDB,
	PushSubscription,
	upsertPushSubscriptionDB,
} from "../../../src/server/models/pushSubscriptions";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const USER = "user-push-1";
const OTHER = "user-push-2";

function payload(overrides: Record<string, unknown> = {}) {
	return {
		userId: USER,
		endpoint: "https://push.example/ep-1",
		p256dh: "p256dh-key",
		auth: "auth-secret",
		userAgent: "vitest",
		...overrides,
	};
}

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterEach(() => {
	vi.restoreAllMocks();
});
afterAll(async () => {
	await dropTestDB();
});

describe("upsertPushSubscriptionDB", () => {
	it("inserts a new subscription", async () => {
		expect(await upsertPushSubscriptionDB({ payload: payload() })).toBe(
			true,
		);
		const inDb = await PushSubscription.findOne({
			endpoint: "https://push.example/ep-1",
		}).lean();
		expect(inDb?.userId).toBe(USER);
		expect(inDb?.p256dh).toBe("p256dh-key");
		expect(inDb?.deleted).toBe(false);
	});

	it("returns false when the upsert throws (catch path)", async () => {
		vi.spyOn(PushSubscription, "findOneAndUpdate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(await upsertPushSubscriptionDB({ payload: payload() })).toBe(
			false,
		);
	});

	it("updates in place on the same endpoint (no duplicate) and revives deleted", async () => {
		await upsertPushSubscriptionDB({ payload: payload() });
		await PushSubscription.updateOne(
			{ endpoint: "https://push.example/ep-1" },
			{ $set: { deleted: true } },
		);

		expect(
			await upsertPushSubscriptionDB({
				payload: payload({ p256dh: "rotated-key", auth: "new-auth" }),
			}),
		).toBe(true);

		const docs = await PushSubscription.find({
			endpoint: "https://push.example/ep-1",
		}).lean();
		expect(docs).toHaveLength(1);
		expect(docs[0]?.p256dh).toBe("rotated-key");
		expect(docs[0]?.auth).toBe("new-auth");
		expect(docs[0]?.deleted).toBe(false);
	});

	it("can move an endpoint to a different user", async () => {
		await upsertPushSubscriptionDB({ payload: payload() });
		await upsertPushSubscriptionDB({ payload: payload({ userId: OTHER }) });
		const docs = await PushSubscription.find({}).lean();
		expect(docs).toHaveLength(1);
		expect(docs[0]?.userId).toBe(OTHER);
	});
});

describe("getPushSubscriptionsByUserDB", () => {
	it("returns only the user's non-deleted subscriptions", async () => {
		await upsertPushSubscriptionDB({ payload: payload() });
		await upsertPushSubscriptionDB({
			payload: payload({ endpoint: "https://push.example/ep-2" }),
		});
		await upsertPushSubscriptionDB({
			payload: payload({
				endpoint: "https://push.example/ep-3",
				userId: OTHER,
			}),
		});
		await PushSubscription.updateOne(
			{ endpoint: "https://push.example/ep-2" },
			{ $set: { deleted: true } },
		);

		const subs = await getPushSubscriptionsByUserDB({ userId: USER });
		expect(subs).toHaveLength(1);
		expect(subs[0]?.endpoint).toBe("https://push.example/ep-1");
	});

	it("returns [] for a user with no subscriptions", async () => {
		expect(await getPushSubscriptionsByUserDB({ userId: "ghost" })).toEqual(
			[],
		);
	});

	it("returns [] when the query throws (catch path)", async () => {
		vi.spyOn(PushSubscription, "find").mockImplementationOnce(() => {
			throw new Error("boom");
		});
		expect(await getPushSubscriptionsByUserDB({ userId: USER })).toEqual(
			[],
		);
	});
});

describe("deletePushSubscriptionByEndpointDB", () => {
	it("deletes by endpoint scoped to the user", async () => {
		await upsertPushSubscriptionDB({ payload: payload() });
		expect(
			await deletePushSubscriptionByEndpointDB({
				endpoint: "https://push.example/ep-1",
				userId: USER,
			}),
		).toBe(true);
		expect(await PushSubscription.countDocuments({})).toBe(0);
	});

	it("does not delete another user's subscription when userId is given", async () => {
		await upsertPushSubscriptionDB({ payload: payload() });
		await deletePushSubscriptionByEndpointDB({
			endpoint: "https://push.example/ep-1",
			userId: OTHER,
		});
		// deleteOne matched nothing — doc must still exist
		expect(await PushSubscription.countDocuments({})).toBe(1);
	});

	it("deletes by endpoint alone when no userId is given", async () => {
		await upsertPushSubscriptionDB({ payload: payload() });
		expect(
			await deletePushSubscriptionByEndpointDB({
				endpoint: "https://push.example/ep-1",
			}),
		).toBe(true);
		expect(await PushSubscription.countDocuments({})).toBe(0);
	});

	it("returns false when the delete throws (catch path)", async () => {
		vi.spyOn(PushSubscription, "deleteOne").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(
			await deletePushSubscriptionByEndpointDB({
				endpoint: "https://push.example/ep-1",
				userId: USER,
			}),
		).toBe(false);
	});
});
