import { Notification } from "../../models/notifications";
import type { INotification } from "../../models/notifications/types";

// Lightweight payload for the navbar bell dropdown: just the unread count
// plus the most recent few notifications, regardless of read state. Kept
// separate from the full `/api/notifications` list so the bell can poll
// cheaply (single index hit, capped projection).

export interface UnreadSummary {
	unread: number;
	recent: INotification[];
}

export default async function unreadSummary({
	userId,
	previewLimit = 5,
}: {
	userId: string;
	previewLimit?: number;
}): Promise<UnreadSummary> {
	const limit = Math.min(Math.max(previewLimit, 1), 20);
	try {
		const [unread, recent] = await Promise.all([
			Notification.countDocuments({
				userId,
				channel: "in-app",
				status: { $in: ["queued", "sent"] },
			}),
			Notification.find({ userId })
				.sort({ createdAt: -1 })
				.limit(limit)
				.lean<INotification[]>(),
		]);
		return { unread, recent };
	} catch {
		return { unread: 0, recent: [] };
	}
}
