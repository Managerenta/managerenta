import mongoose from "mongoose";
import type { IPushSubscription, IPushSubscriptionCreateInput } from "./types";

const collectionName = "pushsubscriptions";

const schema = new mongoose.Schema<IPushSubscription>(
	{
		userId: { type: String, required: true, index: true },
		endpoint: { type: String, required: true, unique: true },
		p256dh: { type: String, required: true },
		auth: { type: String, required: true },
		userAgent: { type: String, required: false },
		deleted: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

export const PushSubscription: mongoose.Model<IPushSubscription> =
	(mongoose.models[collectionName] as
		| mongoose.Model<IPushSubscription>
		| undefined) ??
	mongoose.model<IPushSubscription>(collectionName, schema);

export async function upsertPushSubscriptionDB({
	payload,
}: {
	payload: IPushSubscriptionCreateInput;
}): Promise<boolean> {
	try {
		await PushSubscription.findOneAndUpdate(
			{ endpoint: payload.endpoint },
			{ $set: { ...payload, deleted: false } },
			{ upsert: true, returnDocument: "after" },
		);
		return true;
	} catch {
		return false;
	}
}

export async function getPushSubscriptionsByUserDB({
	userId,
}: {
	userId: string;
}): Promise<IPushSubscription[]> {
	try {
		const docs = await PushSubscription.find({
			userId,
			deleted: false,
		}).lean();
		return docs as unknown as IPushSubscription[];
	} catch {
		return [];
	}
}

export async function deletePushSubscriptionByEndpointDB({
	endpoint,
	userId,
}: {
	endpoint: string;
	userId?: string;
}): Promise<boolean> {
	try {
		const filter: Record<string, unknown> = { endpoint };
		if (userId) filter.userId = userId;
		await PushSubscription.deleteOne(filter);
		return true;
	} catch {
		return false;
	}
}

export * from "./types";
