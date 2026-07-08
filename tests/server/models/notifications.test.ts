import mongoose from "mongoose";
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
	createNotificationDB,
	deleteNotificationDB,
	getNotificationsForUserDB,
	markAllNotificationsReadDB,
	markNotificationReadDB,
	Notification,
} from "../../../src/server/models/notifications";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const USER = "user-notif-1";
const OTHER = "user-notif-2";

function payload(overrides: Record<string, unknown> = {}) {
	return {
		userId: USER,
		channel: "in-app" as const,
		kind: "rent-due" as const,
		title: "Rent due",
		body: "Rent is due tomorrow",
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

describe("createNotificationDB", () => {
	it("creates a notification with queued default status", async () => {
		const doc = await createNotificationDB(payload());
		expect(doc).not.toBeNull();
		expect(doc?.status).toBe("queued");

		const inDb = await Notification.findById(doc?._id).lean();
		expect(inDb?.title).toBe("Rent due");
		expect(inDb?.userId).toBe(USER);
	});

	it("honours an explicit status", async () => {
		const doc = await createNotificationDB(payload({ status: "sent" }));
		expect(doc?.status).toBe("sent");
	});

	it("returns null on invalid channel/kind enums", async () => {
		expect(await createNotificationDB(payload({ channel: "pigeon" }) as never)).toBeNull();
		expect(await createNotificationDB(payload({ kind: "gossip" }) as never)).toBeNull();
		expect(await Notification.countDocuments({})).toBe(0);
	});
});

describe("getNotificationsForUserDB", () => {
	it("returns the user's notifications newest first with total and unread", async () => {
		await Notification.create({ ...payload({ title: "Old" }), createdAt: new Date("2024-01-01") });
		await Notification.create({ ...payload({ title: "New" }), createdAt: new Date("2024-06-01") });
		await Notification.create(payload({ title: "Foreign", userId: OTHER }));

		const res = await getNotificationsForUserDB({ userId: USER });
		expect(res.total).toBe(2);
		expect(res.data.map((n) => n.title)).toEqual(["New", "Old"]);
		expect(res.unread).toBe(2);
	});

	it("counts unread as in-app notifications with queued/sent status only", async () => {
		await createNotificationDB(payload({ title: "q" })); // queued in-app -> unread
		await createNotificationDB(payload({ title: "s", status: "sent" })); // unread
		await createNotificationDB(payload({ title: "r", status: "read" })); // read
		await createNotificationDB(payload({ title: "f", status: "failed" })); // failed
		await createNotificationDB(
			payload({ title: "email", channel: "email" }), // queued but not in-app
		);

		const res = await getNotificationsForUserDB({ userId: USER });
		expect(res.total).toBe(5);
		expect(res.unread).toBe(2);
	});

	it("paginates with limit/offset and caps limit at 100", async () => {
		const docs = Array.from({ length: 105 }, (_, i) => ({
			...payload({ title: `N${i}` }),
			createdAt: new Date(2024, 0, 1, 0, 0, i),
		}));
		await Notification.insertMany(docs);

		const page = await getNotificationsForUserDB({ userId: USER, limit: 2, offset: 1 });
		expect(page.total).toBe(105);
		expect(page.data.map((n) => n.title)).toEqual(["N103", "N102"]);

		const capped = await getNotificationsForUserDB({ userId: USER, limit: 5000 });
		expect(capped.data).toHaveLength(100);
	});

	it("returns empty shape for an unknown user", async () => {
		expect(await getNotificationsForUserDB({ userId: "ghost" })).toEqual({
			data: [],
			total: 0,
			unread: 0,
		});
	});

	it("returns the zeroed shape when the query throws (catch path)", async () => {
		vi.spyOn(Notification, "countDocuments").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(await getNotificationsForUserDB({ userId: USER })).toEqual({
			data: [],
			total: 0,
			unread: 0,
		});
	});
});

describe("markNotificationReadDB", () => {
	it("marks the user's notification read and sets readAt", async () => {
		const doc = await createNotificationDB(payload());
		const ok = await markNotificationReadDB({
			userId: USER,
			id: String(doc!._id),
		});
		expect(ok).toBe(true);
		const inDb = await Notification.findById(doc!._id).lean();
		expect(inDb?.status).toBe("read");
		expect(inDb?.readAt).toBeInstanceOf(Date);
	});

	it("returns false for another user's notification and leaves it unread", async () => {
		const doc = await createNotificationDB(payload());
		expect(
			await markNotificationReadDB({ userId: OTHER, id: String(doc!._id) }),
		).toBe(false);
		const inDb = await Notification.findById(doc!._id).lean();
		expect(inDb?.status).toBe("queued");
	});

	it("returns false for malformed or unknown ids", async () => {
		expect(await markNotificationReadDB({ userId: USER, id: "junk" })).toBe(false);
		expect(
			await markNotificationReadDB({
				userId: USER,
				id: new mongoose.Types.ObjectId().toString(),
			}),
		).toBe(false);
	});
});

describe("markAllNotificationsReadDB", () => {
	it("marks only the user's queued/sent notifications read", async () => {
		await createNotificationDB(payload({ title: "q" }));
		await createNotificationDB(payload({ title: "s", status: "sent" }));
		await createNotificationDB(payload({ title: "f", status: "failed" }));
		await createNotificationDB(payload({ title: "other", userId: OTHER }));

		expect(await markAllNotificationsReadDB({ userId: USER })).toBe(true);

		expect(
			await Notification.countDocuments({ userId: USER, status: "read" }),
		).toBe(2);
		// failed stays failed
		expect(
			await Notification.countDocuments({ userId: USER, status: "failed" }),
		).toBe(1);
		// other user's untouched
		expect(
			await Notification.countDocuments({ userId: OTHER, status: "queued" }),
		).toBe(1);
	});

	it("returns true even when nothing matched", async () => {
		expect(await markAllNotificationsReadDB({ userId: "ghost" })).toBe(true);
	});

	it("returns false when the bulk update throws (catch path)", async () => {
		vi.spyOn(Notification, "updateMany").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(await markAllNotificationsReadDB({ userId: USER })).toBe(false);
	});
});

describe("deleteNotificationDB", () => {
	it("hard-deletes the user's notification", async () => {
		const doc = await createNotificationDB(payload());
		expect(
			await deleteNotificationDB({ userId: USER, id: String(doc!._id) }),
		).toBe(true);
		expect(await Notification.findById(doc!._id)).toBeNull();
	});

	it("returns false for another user's notification and keeps it", async () => {
		const doc = await createNotificationDB(payload());
		expect(
			await deleteNotificationDB({ userId: OTHER, id: String(doc!._id) }),
		).toBe(false);
		expect(await Notification.findById(doc!._id)).not.toBeNull();
	});

	it("returns false for malformed ids", async () => {
		expect(await deleteNotificationDB({ userId: USER, id: "not-an-oid" })).toBe(false);
	});
});
