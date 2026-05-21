import mongoose from "mongoose";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../utils";
import type { INotification, INotificationCreateInput } from "./types";

const collectionName = "notifications";

const schema = new mongoose.Schema<INotification>(
	{
		userId: { type: String, required: true, index: true },
		tenantId: { type: String, required: false },
		organizationId: { type: String, required: false },
		channel: {
			type: String,
			enum: ["email", "sms", "whatsapp", "in-app"],
			required: true,
		},
		kind: {
			type: String,
			enum: [
				"rent-due",
				"rent-overdue",
				"payment-received",
				"lease-expiry",
				"tenant-move-in",
				"tenant-move-out",
				"org-invite",
				"email-verification",
				"password-reset",
				"system",
			],
			required: true,
		},
		title: { type: String, required: true },
		body: { type: String, required: true },
		to: { type: String, required: false },
		meta: { type: mongoose.Schema.Types.Mixed, required: false },
		status: {
			type: String,
			enum: ["queued", "sent", "failed", "read"],
			default: "queued",
		},
		sentAt: { type: Date, required: false },
		readAt: { type: Date, required: false },
		error: { type: String, required: false },
	},
	{ timestamps: true },
);

schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, status: 1 });

export const Notification: mongoose.Model<INotification> =
	(mongoose.models[collectionName] as
		| mongoose.Model<INotification>
		| undefined) ?? mongoose.model<INotification>(collectionName, schema);

export async function createNotificationDB(
	payload: INotificationCreateInput & { status?: INotification["status"] },
): Promise<INotification | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const doc = await Notification.create(payload);
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createNotificationDB",
			success: "true",
		});
		return doc;
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createNotificationDB",
			success: "false",
		});
		return null;
	}
}

export async function getNotificationsForUserDB({
	userId,
	limit = 20,
	offset = 0,
}: {
	userId: string;
	limit?: number;
	offset?: number;
}): Promise<{ data: INotification[]; total: number; unread: number }> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const [data, total, unread] = await Promise.all([
			Notification.find({ userId })
				.sort({ createdAt: -1 })
				.skip(offset)
				.limit(Math.min(limit, 100))
				.lean<INotification[]>(),
			Notification.countDocuments({ userId }),
			Notification.countDocuments({
				userId,
				channel: "in-app",
				status: { $in: ["queued", "sent"] },
			}),
		]);
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getNotificationsForUserDB",
			success: "true",
		});
		return { data, total, unread };
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getNotificationsForUserDB",
			success: "false",
		});
		return { data: [], total: 0, unread: 0 };
	}
}

export async function markNotificationReadDB({
	userId,
	id,
}: {
	userId: string;
	id: string;
}): Promise<boolean> {
	try {
		const result = await Notification.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id), userId },
			{ status: "read", readAt: new Date() },
		);
		return !!result;
	} catch {
		return false;
	}
}

export async function markAllNotificationsReadDB({
	userId,
}: {
	userId: string;
}): Promise<boolean> {
	try {
		await Notification.updateMany(
			{ userId, status: { $in: ["queued", "sent"] } },
			{ status: "read", readAt: new Date() },
		);
		return true;
	} catch {
		return false;
	}
}

export async function deleteNotificationDB({
	userId,
	id,
}: {
	userId: string;
	id: string;
}): Promise<boolean> {
	try {
		const result = await Notification.deleteOne({
			_id: new mongoose.Types.ObjectId(id),
			userId,
		});
		return result.deletedCount > 0;
	} catch {
		return false;
	}
}

export * from "./types";
