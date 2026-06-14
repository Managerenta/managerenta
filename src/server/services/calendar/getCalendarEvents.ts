import mongoose from "mongoose";

export type ICalendarEventType = "rent-due" | "lease-expiry" | "maintenance";

export interface ICalendarEvent {
	date: string; // YYYY-MM-DD
	type: ICalendarEventType;
	title: string;
	subtitle?: string;
	refId?: string;
}

function ymd(d: Date): string {
	const y = d.getFullYear();
	const m = `${d.getMonth() + 1}`.padStart(2, "0");
	const day = `${d.getDate()}`.padStart(2, "0");
	return `${y}-${m}-${day}`;
}

/**
 * Build the list of dated events for a given month: rent due dates for active
 * tenants, lease expiries, and scheduled maintenance visits.
 */
export default async function getCalendarEvents({
	userId,
	year,
	month, // 0-based
}: {
	userId: string;
	year: number;
	month: number;
}): Promise<{ events: ICalendarEvent[] }> {
	const Tenant = mongoose.models.tenants;
	const Property = mongoose.models.properties;
	const Maintenance = mongoose.models.maintenancerequests;

	const monthStart = new Date(year, month, 1);
	const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
	const daysInMonth = monthEnd.getDate();
	const events: ICalendarEvent[] = [];

	const propertyName = new Map<string, string>();
	if (Property) {
		const props = (await Property.find({ userId, deleted: false })
			.select({ name: 1 })
			.lean()) as any[];
		for (const p of props) propertyName.set(p._id.toString(), p.name);
	}

	if (Tenant) {
		const tenants = (await Tenant.find({
			userId,
			deleted: false,
			status: "Active",
		}).lean()) as any[];

		for (const t of tenants) {
			const pName = propertyName.get(t.propertyId) ?? "";

			// Rent due each month on rentDueDay (clamped to month length).
			const dueDay = Math.min(t.rentDueDay ?? 1, daysInMonth);
			events.push({
				date: ymd(new Date(year, month, dueDay)),
				type: "rent-due",
				title: `Rent due · ${t.name}`,
				subtitle: pName,
				refId: t._id.toString(),
			});

			// Lease expiry if it falls within this month.
			if (t.leaseExpiry) {
				const exp = new Date(t.leaseExpiry);
				if (exp >= monthStart && exp <= monthEnd) {
					events.push({
						date: ymd(exp),
						type: "lease-expiry",
						title: `Lease expires · ${t.name}`,
						subtitle: pName,
						refId: t._id.toString(),
					});
				}
			}
		}
	}

	if (Maintenance) {
		const reqs = (await Maintenance.find({
			userId,
			deleted: false,
			scheduledDate: { $gte: monthStart, $lte: monthEnd },
		}).lean()) as any[];
		for (const r of reqs) {
			events.push({
				date: ymd(new Date(r.scheduledDate)),
				type: "maintenance",
				title: r.title,
				subtitle: propertyName.get(r.propertyId) ?? "",
				refId: r._id.toString(),
			});
		}
	}

	return { events };
}
