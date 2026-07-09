import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MaintenanceRequest } from "../../../src/server/models/maintenance";
import getCalendarEvents from "../../../src/server/services/calendar/getCalendarEvents";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import { newId, seedProperty, seedTenant, seedUnit } from "../../helpers/seed";

describe("calendar service", () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	beforeEach(async () => {
		await clearTestDB();
	});

	afterAll(async () => {
		await clearTestDB();
	});

	it("emits rent-due, lease-expiry and maintenance events with exact dates for the month", async () => {
		const userId = newId();
		const { propertyId } = await seedProperty({
			userId,
			name: "Calendar Close",
		});
		const { unitId } = await seedUnit({ userId, propertyId });

		// Rent due on the 15th; lease expires 20 Jul 2026.
		const { tenantId } = await seedTenant({
			userId,
			propertyId,
			unitId,
			name: "Cal Tenant",
			rentDueDay: 15,
			leaseExpiry: new Date(2026, 6, 20),
		});

		// Second tenant: lease expires in August → no expiry event in July.
		const { unitId: unit2 } = await seedUnit({ userId, propertyId });
		await seedTenant({
			userId,
			propertyId,
			unitId: unit2,
			name: "August Alice",
			rentDueDay: 1,
			leaseExpiry: new Date(2026, 7, 2),
		});

		// Inactive tenant → completely excluded.
		const { unitId: unit3 } = await seedUnit({ userId, propertyId });
		await seedTenant({
			userId,
			propertyId,
			unitId: unit3,
			name: "Gone Gary",
			status: "Inactive",
			rentDueDay: 10,
		});

		// Scheduled maintenance inside the month + one outside.
		const inMonth = await MaintenanceRequest.create({
			userId,
			propertyId,
			title: "Service AC",
			description: "Annual AC servicing",
			category: "hvac",
			scheduledDate: new Date(2026, 6, 10),
		});
		await MaintenanceRequest.create({
			userId,
			propertyId,
			title: "Not this month",
			description: "August work",
			category: "other",
			scheduledDate: new Date(2026, 7, 10),
		});

		const { events } = await getCalendarEvents({
			userId,
			year: 2026,
			month: 6, // July (0-based)
		});

		const byType = (type: string) => events.filter((e) => e.type === type);

		// Two active tenants → two rent-due events.
		expect(
			byType("rent-due")
				.map((e) => [e.date, e.title])
				.sort(),
		).toEqual([
			["2026-07-01", "Rent due · August Alice"],
			["2026-07-15", "Rent due · Cal Tenant"],
		]);
		expect(
			byType("rent-due").every((e) => e.subtitle === "Calendar Close"),
		).toBe(true);

		expect(byType("lease-expiry")).toEqual([
			{
				date: "2026-07-20",
				type: "lease-expiry",
				title: "Lease expires · Cal Tenant",
				subtitle: "Calendar Close",
				refId: tenantId,
			},
		]);

		expect(byType("maintenance")).toEqual([
			{
				date: "2026-07-10",
				type: "maintenance",
				title: "Service AC",
				subtitle: "Calendar Close",
				refId: inMonth._id.toString(),
			},
		]);

		expect(events).toHaveLength(4);
	});

	it("returns no events for a user with no data", async () => {
		const { events } = await getCalendarEvents({
			userId: newId(),
			year: 2026,
			month: 6,
		});
		expect(events).toEqual([]);
	});
});
