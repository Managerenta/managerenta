import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ErrPropertyNotFound } from "../../../src/server/constants";
import { MaintenanceRequest } from "../../../src/server/models/maintenance";
import { Vendor } from "../../../src/server/models/vendors";
import {
	createMaintenance,
	deleteMaintenance,
	getMaintenanceById,
	getMaintenanceRequests,
	updateMaintenance,
} from "../../../src/server/services/maintenance";
import {
	createVendor,
	deleteVendor,
	getVendorById,
	getVendors,
	updateVendor,
} from "../../../src/server/services/vendors";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import { newId, seedProperty } from "../../helpers/seed";

describe("maintenance service", () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	beforeEach(async () => {
		await clearTestDB();
	});

	afterAll(async () => {
		await clearTestDB();
	});

	it("creates a request with defaults against an owned property", async () => {
		const userId = newId();
		const { propertyId } = await seedProperty({ userId });

		const request = await createMaintenance({
			userId,
			propertyId,
			title: "Broken heater",
			description: "No hot water in unit 2",
			category: "hvac",
		});

		expect(request).not.toBeNull();
		expect(request?.status).toBe("open");
		expect(request?.priority).toBe("medium");
		expect(request?.propertyId).toBe(propertyId);
	});

	it("throws ErrPropertyNotFound for a missing or foreign property", async () => {
		const { propertyId } = await seedProperty({ userId: newId() });
		await expect(
			createMaintenance({
				userId: newId(),
				propertyId,
				title: "x",
				description: "y",
				category: "other",
			}),
		).rejects.toBe(ErrPropertyNotFound);
		await expect(
			createMaintenance({
				userId: newId(),
				propertyId: newId(),
				title: "x",
				description: "y",
				category: "other",
			}),
		).rejects.toBe(ErrPropertyNotFound);
	});

	it("updateMaintenance stamps completedDate when marking completed without one", async () => {
		const userId = newId();
		const { propertyId } = await seedProperty({ userId });
		const request = await createMaintenance({
			userId,
			propertyId,
			title: "Paint hallway",
			description: "Scuffed walls",
			category: "other",
		});

		const before = Date.now();
		const updated = await updateMaintenance({
			id: request?.id as string,
			userId,
			payload: { status: "completed" },
		});

		expect(updated?.status).toBe("completed");
		const stamped = new Date(updated?.completedDate as Date).getTime();
		expect(stamped).toBeGreaterThanOrEqual(before - 1000);
		expect(stamped).toBeLessThanOrEqual(Date.now() + 1000);
	});

	it("updateMaintenance preserves an explicit completedDate and applies partial payloads", async () => {
		const userId = newId();
		const { propertyId } = await seedProperty({ userId });
		const request = await createMaintenance({
			userId,
			propertyId,
			title: "Fix door",
			description: "Door does not latch",
			category: "structural",
			priority: "high",
		});

		const explicitDate = new Date(2026, 0, 20);
		const updated = await updateMaintenance({
			id: request?.id as string,
			userId,
			payload: { status: "completed", completedDate: explicitDate },
		});
		expect(new Date(updated?.completedDate as Date)).toEqual(explicitDate);

		const partial = await updateMaintenance({
			id: request?.id as string,
			userId,
			payload: { cost: 120 },
		});
		expect(partial?.cost).toBe(120);
		expect(partial?.title).toBe("Fix door");
		expect(partial?.priority).toBe("high");
	});

	it("updateMaintenance is owner-scoped", async () => {
		const userId = newId();
		const { propertyId } = await seedProperty({ userId });
		const request = await createMaintenance({
			userId,
			propertyId,
			title: "Scoped",
			description: "Scoped update",
			category: "other",
		});

		const foreign = await updateMaintenance({
			id: request?.id as string,
			userId: newId(),
			payload: { title: "Hijack" },
		});
		expect(foreign).toBeNull();
	});

	it("lists requests with filters, search and status stats", async () => {
		const userId = newId();
		const { propertyId } = await seedProperty({ userId });
		await createMaintenance({
			userId,
			propertyId,
			title: "Leaking sink",
			description: "Sink leaks",
			category: "plumbing",
			priority: "urgent",
		});
		const done = await createMaintenance({
			userId,
			propertyId,
			title: "Bulb replacement",
			description: "Corridor bulb out",
			category: "electrical",
		});
		await updateMaintenance({
			id: done?.id as string,
			userId,
			payload: { status: "completed" },
		});

		const all = await getMaintenanceRequests({ userId });
		expect(all.total).toBe(2);
		expect(all.stats).toEqual({
			open: 1,
			inProgress: 0,
			completed: 1,
			total: 2,
		});

		const openOnly = await getMaintenanceRequests({
			userId,
			status: "open",
		});
		expect(openOnly.total).toBe(1);
		expect(openOnly.requests[0].title).toBe("Leaking sink");

		const urgent = await getMaintenanceRequests({
			userId,
			priority: "urgent",
		});
		expect(urgent.total).toBe(1);

		const searched = await getMaintenanceRequests({
			userId,
			search: "bulb",
		});
		expect(searched.total).toBe(1);
		expect(searched.requests[0].title).toBe("Bulb replacement");
	});

	it("deleteMaintenance soft-deletes and hides the request from reads", async () => {
		const userId = newId();
		const { propertyId } = await seedProperty({ userId });
		const request = await createMaintenance({
			userId,
			propertyId,
			title: "To be removed",
			description: "bye",
			category: "other",
		});

		expect(
			await deleteMaintenance({ id: request?.id as string, userId }),
		).toBe(true);

		expect(
			await getMaintenanceById({ id: request?.id as string, userId }),
		).toBeNull();
		const raw = await MaintenanceRequest.findById(request?.id).lean();
		expect(raw?.deleted).toBe(true);

		// Foreign delete → false.
		expect(await deleteMaintenance({ id: newId(), userId })).toBe(false);
	});
});

describe("vendors service", () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	beforeEach(async () => {
		await clearTestDB();
	});

	afterAll(async () => {
		await clearTestDB();
	});

	it("creates, reads, updates and soft-deletes a vendor", async () => {
		const userId = newId();
		const vendor = await createVendor({
			userId,
			name: "Pipes R Us",
			specialty: "plumbing",
			rating: 4,
			phone: "+2348055555555",
		});
		expect(vendor).not.toBeNull();
		expect(vendor?.rating).toBe(4);

		const fetched = await getVendorById({
			id: vendor?.id as string,
			userId,
		});
		expect(fetched?.name).toBe("Pipes R Us");

		const updated = await updateVendor({
			id: vendor?.id as string,
			userId,
			payload: { notes: "Reliable", rating: 5 },
		});
		expect(updated?.notes).toBe("Reliable");
		expect(updated?.rating).toBe(5);
		expect(updated?.name).toBe("Pipes R Us");

		expect(
			await deleteVendor({ id: vendor?.id as string, userId }),
		).toBeTruthy();
		expect(
			await getVendorById({ id: vendor?.id as string, userId }),
		).toBeNull();
		const raw = await Vendor.findById(vendor?.id).lean();
		expect(raw?.deleted).toBe(true);
	});

	it("rejects a rating outside the schema's 0-5 range with null", async () => {
		const vendor = await createVendor({
			userId: newId(),
			name: "Too Good",
			specialty: "cleaning",
			rating: 7,
		});
		expect(vendor).toBeNull();
	});

	it("filters vendors by specialty and search, scoped to the owner", async () => {
		const userId = newId();
		await createVendor({
			userId,
			name: "Amp Electrics",
			specialty: "electrical",
		});
		await createVendor({
			userId,
			name: "CoolFlow HVAC",
			company: "CoolFlow Ltd",
			specialty: "hvac",
		});
		await createVendor({
			userId: newId(),
			name: "Other Owner Vendor",
			specialty: "electrical",
		});

		const electricians = await getVendors({
			userId,
			specialty: "electrical",
		});
		expect(electricians.total).toBe(1);
		expect(electricians.vendors[0].name).toBe("Amp Electrics");

		const searched = await getVendors({ userId, search: "coolflow" });
		expect(searched.total).toBe(1);
		expect(searched.vendors[0].specialty).toBe("hvac");

		const everything = await getVendors({ userId });
		expect(everything.total).toBe(2);
	});

	it("scopes reads and updates to the owner", async () => {
		const userId = newId();
		const vendor = await createVendor({
			userId,
			name: "Private Vendor",
			specialty: "general",
		});

		expect(
			await getVendorById({ id: vendor?.id as string, userId: newId() }),
		).toBeNull();
		expect(
			await updateVendor({
				id: vendor?.id as string,
				userId: newId(),
				payload: { name: "Stolen" },
			}),
		).toBeNull();
	});
});
