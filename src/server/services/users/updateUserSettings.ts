import { updateUserRawDB } from "../../models";
import type {
	IUserNotificationSettings,
	IUserPreferences,
	IUserReminderSettings,
} from "../../models/users/types";
import { invalidateCacheKeys } from "./utils";

type Section = "preferences" | "notifications" | "reminders";

type Payload =
	| Partial<IUserPreferences>
	| Partial<IUserNotificationSettings>
	| Partial<IUserReminderSettings>;

export default async function updateUserSettings({
	id,
	section,
	payload,
}: {
	id: string;
	section: Section;
	payload: Payload;
}) {
	const update: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(payload)) {
		update[`${section}.${key}`] = value;
	}
	const result = await updateUserRawDB({ id, update: { $set: update } });
	if (!result) return null;
	const idStr =
		typeof result._id === "string" ? result._id : String(result._id);
	await invalidateCacheKeys({ id: idStr, email: result.email });
	return result;
}
