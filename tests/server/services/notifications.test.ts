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
import { Notification } from "../../../src/server/models/notifications";
import dailyRemindersJob from "../../../src/server/services/notifications/dailyRemindersJob";
import {
	notifyPaymentReceived,
	notifyTenantMoveIn,
} from "../../../src/server/services/notifications/events";
import {
	sendNotification,
	setNotificationTransport,
} from "../../../src/server/services/notifications/dispatch";
import listNotifications from "../../../src/server/services/notifications/listNotifications";
import unreadSummary from "../../../src/server/services/notifications/unreadSummary";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import {
	newId,
	seedProperty,
	seedTenant,
	seedTransaction,
	seedUnit,
	seedUser,
} from "../../helpers/seed";

describe("notifications service", () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	beforeEach(async () => {
		await clearTestDB();
	});

	afterAll(async () => {
		await clearTestDB();
	});

	describe("sendNotification (dispatch)", () => {
		it("persists in-app notifications as sent without any transport", async () => {
			const userId = newId();
			const result = await sendNotification({
				userId,
				channels: ["in-app"],
				kind: "system",
				title: "Welcome",
				body: "Hello there",
			});

			expect(result.sent).toBe(1);
			expect(result.failed).toBe(0);

			const doc = await Notification.findOne({ userId }).lean();
			expect(doc).toMatchObject({
				channel: "in-app",
				kind: "system",
				title: "Welcome",
				body: "Hello there",
				status: "sent",
			});
		});

		it("falls back to the in-app channel when no channels are given", async () => {
			const userId = newId();
			await sendNotification({
				userId,
				channels: [],
				kind: "system",
				title: "Fallback",
				body: "No channel supplied",
			});

			const doc = await Notification.findOne({ userId }).lean();
			expect(doc?.channel).toBe("in-app");
		});

		it("uses the console transport by default (no provider env) and marks email sent", async () => {
			const userId = newId();
			const result = await sendNotification({
				userId,
				channels: ["email"],
				kind: "system",
				title: "Email me",
				body: "Body",
				to: "owner@example.test",
			});

			expect(result.sent).toBe(1);
			const doc = await Notification.findOne({ userId }).lean();
			expect(doc?.channel).toBe("email");
			expect(doc?.status).toBe("sent");
			expect(doc?.to).toBe("owner@example.test");
		});

		it("records failed status per channel when the transport reports or throws failure", async () => {
			const userId = newId();
			setNotificationTransport(async ({ channel }) => ({
				ok: false,
				channel,
				error: "provider rejected",
			}));
			try {
				const result = await sendNotification({
					userId,
					channels: ["email", "sms", "in-app"],
					kind: "system",
					title: "Mixed",
					body: "Body",
					to: "someone@example.test",
				});

				// in-app is persisted directly and always succeeds.
				expect(result.sent).toBe(1);
				expect(result.failed).toBe(2);

				const docs = await Notification.find({ userId }).lean();
				const byChannel = Object.fromEntries(
					docs.map((d) => [d.channel, d.status]),
				);
				expect(byChannel).toEqual({
					email: "failed",
					sms: "failed",
					"in-app": "sent",
				});
			} finally {
				setNotificationTransport(async ({ channel }) => ({
					ok: true,
					channel,
				}));
			}
		});

		it("records failed status when the transport throws", async () => {
			const userId = newId();
			setNotificationTransport(async () => {
				throw new Error("boom");
			});
			try {
				const result = await sendNotification({
					userId,
					channels: ["email"],
					kind: "system",
					title: "Throwing",
					body: "Body",
					to: "x@example.test",
				});
				expect(result.failed).toBe(1);
				const doc = await Notification.findOne({ userId }).lean();
				expect(doc?.status).toBe("failed");
			} finally {
				setNotificationTransport(async ({ channel }) => ({
					ok: true,
					channel,
				}));
			}
		});
	});

	describe("event notifications (events.ts guards)", () => {
		it("suppresses events the owner has switched off", async () => {
			const { userId } = await seedUser({
				notifications: { paymentReceived: false },
			});

			await notifyPaymentReceived({
				userId,
				tenantId: newId(),
				tenantName: "Silent Sam",
				amount: 1000,
			});

			expect(await Notification.countDocuments({ userId })).toBe(0);
		});

		it("is a silent no-op for an unknown owner", async () => {
			const ghost = newId();
			await expect(
				notifyTenantMoveIn({
					userId: ghost,
					tenantId: newId(),
					tenantName: "Ghost Tenant",
				}),
			).resolves.toBeUndefined();
			expect(await Notification.countDocuments({ userId: ghost })).toBe(
				0,
			);
		});

		it("formats the payment-received body with currency and unit", async () => {
			const { userId } = await seedUser();
			await notifyPaymentReceived({
				userId,
				tenantId: newId(),
				tenantName: "Kofi Cash",
				unitName: "K-2",
				amount: 250000,
			});

			const doc = await Notification.findOne({ userId }).lean();
			expect(doc?.kind).toBe("payment-received");
			expect(doc?.body).toContain("Kofi Cash");
			expect(doc?.body).toContain("for K-2");
			// NGN formatting with no decimals.
			expect(doc?.body).toMatch(/250,000/);
		});
	});

	describe("listNotifications / unreadSummary", () => {
		it("paginates newest-first and reports totals and unread counts", async () => {
			const userId = newId();
			for (let i = 0; i < 7; i++) {
				await Notification.create({
					userId,
					channel: "in-app",
					kind: "system",
					title: `note-${i}`,
					body: "b",
					status: "sent",
					createdAt: new Date(Date.now() - (7 - i) * 60_000),
				});
			}
			// One read + one email — neither counts as unread.
			await Notification.create({
				userId,
				channel: "in-app",
				kind: "system",
				title: "read-note",
				body: "b",
				status: "read",
			});
			await Notification.create({
				userId,
				channel: "email",
				kind: "system",
				title: "email-note",
				body: "b",
				status: "sent",
			});

			const page = await listNotifications({
				userId,
				limit: 5,
				offset: 0,
			});
			expect(page.total).toBe(9);
			expect(page.data).toHaveLength(5);
			expect(page.unread).toBe(7);

			const page2 = await listNotifications({
				userId,
				limit: 5,
				offset: 5,
			});
			expect(page2.data).toHaveLength(4);

			const summary = await unreadSummary({ userId, previewLimit: 3 });
			expect(summary.unread).toBe(7);
			expect(summary.recent).toHaveLength(3);

			// Foreign user: empty.
			const foreign = await unreadSummary({ userId: newId() });
			expect(foreign).toEqual({ unread: 0, recent: [] });
		});

		it("returns a zeroed summary when the underlying query throws", async () => {
			const userId = newId();
			const spy = vi
				.spyOn(Notification, "countDocuments")
				.mockRejectedValueOnce(new Error("db down"));
			try {
				const summary = await unreadSummary({ userId });
				expect(summary).toEqual({ unread: 0, recent: [] });
			} finally {
				spy.mockRestore();
			}
		});
	});

	describe("dailyRemindersJob", () => {
		// Freeze at 8 Jul 2026 00:00 local so the day math is exact.
		const NOW = new Date(2026, 6, 8, 0, 0, 0);

		beforeEach(() => {
			vi.useFakeTimers({ toFake: ["Date"], now: NOW });
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("sends lead, overdue and lease-expiry reminders per user settings", async () => {
			const { userId } = await seedUser();
			const { propertyId } = await seedProperty({ userId });

			// Lead-time: due day 11 → exactly rentDueLeadDays (3) away.
			const { unitId: u1 } = await seedUnit({ userId, propertyId });
			const { tenantId: leadTenant } = await seedTenant({
				userId,
				propertyId,
				unitId: u1,
				name: "Lead Lena",
				rentDueDay: 11,
				moveInDate: new Date(2026, 4, 1),
			});

			// Overdue: due day 1 → 7 days overdue (repeat interval 7), no
			// covering rent credit.
			const { unitId: u2 } = await seedUnit({ userId, propertyId });
			const { tenantId: overdueTenant } = await seedTenant({
				userId,
				propertyId,
				unitId: u2,
				name: "Overdue Omar",
				rentDueDay: 1,
				moveInDate: new Date(2026, 4, 1),
			});

			// Covered: same due day but July is paid → no reminder.
			const { unitId: u3 } = await seedUnit({ userId, propertyId });
			const { tenantId: coveredTenant } = await seedTenant({
				userId,
				propertyId,
				unitId: u3,
				name: "Covered Cara",
				rentDueDay: 1,
				moveInDate: new Date(2026, 4, 1),
			});
			await seedTransaction({
				userId,
				tenantId: coveredTenant,
				amount: 1000,
				date: new Date(2026, 6, 1),
				periodStart: new Date(2026, 6, 1),
				periodEnd: new Date(2026, 6, 31),
			});

			// Lease expiry: 22 Jul → exactly leaseExpiryLeadDays (14) away;
			// rent due day 20 keeps it out of the lead/overdue branches.
			const { unitId: u4 } = await seedUnit({ userId, propertyId });
			const { tenantId: leaseTenant } = await seedTenant({
				userId,
				propertyId,
				unitId: u4,
				name: "Lease Lior",
				rentDueDay: 20,
				moveInDate: new Date(2026, 0, 1),
				leaseExpiry: new Date(2026, 6, 22),
			});

			const result = await dailyRemindersJob();

			expect(result.usersScanned).toBe(1);
			expect(result.remindersSent).toBe(3);

			const kindsByTenant = async (tenantId: string) =>
				(await Notification.find({ userId, tenantId }).lean()).map(
					(n) => n.kind,
				);

			expect(await kindsByTenant(leadTenant)).toEqual(["rent-due"]);
			expect(await kindsByTenant(overdueTenant)).toEqual([
				"rent-overdue",
			]);
			expect(await kindsByTenant(coveredTenant)).toEqual([]);

			// Lease expiry dispatches with email fallback: in-app + email.
			const leaseNotes = await Notification.find({
				userId,
				tenantId: leaseTenant,
			}).lean();
			expect(leaseNotes).toHaveLength(2);
			expect(leaseNotes.every((n) => n.kind === "lease-expiry")).toBe(
				true,
			);
			expect(leaseNotes.map((n) => n.channel).sort()).toEqual([
				"email",
				"in-app",
			]);
		});

		it("skips users who disabled the relevant reminder switches", async () => {
			const { userId } = await seedUser({
				reminders: {
					autoSendOnDueDay: false,
					autoSendForOverdue: false,
					rentDueLeadDays: 3,
					overdueRepeatDays: 7,
					leaseExpiryLeadDays: 14,
				},
			});
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({ userId, propertyId });
			await seedTenant({
				userId,
				propertyId,
				unitId,
				rentDueDay: 1, // would be 7 days overdue
				moveInDate: new Date(2026, 4, 1),
			});

			const result = await dailyRemindersJob();
			expect(result.remindersSent).toBe(0);
			expect(await Notification.countDocuments({ userId })).toBe(0);
		});
	});
});
