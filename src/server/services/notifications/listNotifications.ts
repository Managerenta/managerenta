import { getNotificationsForUserDB } from "../../models";

export default async function listNotifications({
	userId,
	limit,
	offset,
}: {
	userId: string;
	limit?: number;
	offset?: number;
}) {
	return getNotificationsForUserDB({ userId, limit, offset });
}
