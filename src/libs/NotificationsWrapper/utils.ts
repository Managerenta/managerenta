import type { INotificationRow } from "@/hooks";

export type NotificationFilter =
	| "all"
	| "unread"
	| "payments"
	| "reminders"
	| "tenants"
	| "system";

export function matchesFilter(
	n: INotificationRow,
	filter: NotificationFilter,
): boolean {
	switch (filter) {
		case "all":
			return true;
		case "unread":
			return n.status !== "read";
		case "payments":
			return n.kind === "payment-received";
		case "reminders":
			return (
				n.kind === "rent-due" ||
				n.kind === "rent-overdue" ||
				n.kind === "lease-expiry"
			);
		case "tenants":
			return n.kind === "tenant-move-in" || n.kind === "tenant-move-out";
		case "system":
			return (
				n.kind === "system" ||
				n.kind === "org-invite" ||
				n.kind === "email-verification" ||
				n.kind === "password-reset"
			);
	}
}

export function relativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return "";
	const diffMs = Date.now() - then;
	const sec = Math.max(0, Math.round(diffMs / 1000));
	if (sec < 60) return "just now";
	const min = Math.round(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.round(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.round(hr / 24);
	if (day < 7) return `${day}d ago`;
	const week = Math.round(day / 7);
	if (week < 5) return `${week}w ago`;
	return new Date(iso).toLocaleDateString();
}

export type GroupKey = "today" | "yesterday" | "this-week" | "earlier";

export interface NotificationGroup {
	key: GroupKey;
	label: string;
	rows: INotificationRow[];
}

function startOfDay(d: Date): number {
	const c = new Date(d);
	c.setHours(0, 0, 0, 0);
	return c.getTime();
}

export function groupNotifications(
	rows: INotificationRow[],
): NotificationGroup[] {
	const now = new Date();
	const todayStart = startOfDay(now);
	const yesterdayStart = todayStart - 86_400_000;
	const weekStart = todayStart - 6 * 86_400_000;

	const buckets: Record<GroupKey, INotificationRow[]> = {
		today: [],
		yesterday: [],
		"this-week": [],
		earlier: [],
	};

	for (const row of rows) {
		const t = new Date(row.createdAt).getTime();
		if (Number.isNaN(t)) {
			buckets.earlier.push(row);
			continue;
		}
		if (t >= todayStart) buckets.today.push(row);
		else if (t >= yesterdayStart) buckets.yesterday.push(row);
		else if (t >= weekStart) buckets["this-week"].push(row);
		else buckets.earlier.push(row);
	}

	const order: { key: GroupKey; label: string }[] = [
		{ key: "today", label: "Today" },
		{ key: "yesterday", label: "Yesterday" },
		{ key: "this-week", label: "Earlier this week" },
		{ key: "earlier", label: "Older" },
	];

	return order
		.map(({ key, label }) => ({ key, label, rows: buckets[key] }))
		.filter((g) => g.rows.length > 0);
}

export interface KindMeta {
	label: string;
	tone: "info" | "success" | "warn" | "danger" | "neutral";
}

export const KIND_META: Record<INotificationRow["kind"], KindMeta> = {
	"rent-due": { label: "Rent due", tone: "warn" },
	"rent-overdue": { label: "Rent overdue", tone: "danger" },
	"payment-received": { label: "Payment", tone: "success" },
	"lease-expiry": { label: "Lease", tone: "warn" },
	"tenant-move-in": { label: "Move-in", tone: "info" },
	"tenant-move-out": { label: "Move-out", tone: "neutral" },
	"org-invite": { label: "Invite", tone: "info" },
	"email-verification": { label: "Email", tone: "info" },
	"password-reset": { label: "Security", tone: "warn" },
	system: { label: "System", tone: "neutral" },
};
