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
import {
	ErrResourceAlreadyExist,
	ErrTenantNotFound,
	ErrUnitNotFound,
} from "../../../src/server/constants";
import { Notification } from "../../../src/server/models/notifications";
import { Tenant } from "../../../src/server/models/tenants";
import { Unit } from "../../../src/server/models/units";
import addTenant from "../../../src/server/services/tenants/addTenant";
import deleteTenant from "../../../src/server/services/tenants/deleteTenant";
import sendRentReminder from "../../../src/server/services/tenants/sendRentReminder";
import updateTenant from "../../../src/server/services/tenants/updateTenant";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import {
	ensureCollectionsReady,
	newId,
	seedProperty,
	seedTenant,
	seedUnit,
	seedUser,
	waitFor,
} from "../../helpers/seed";

describe("tenants service", () => {
	beforeAll(async () => {
		await connectTestDB();
		await ensureCollectionsReady();
	});

	beforeEach(async () => {
		await clearTestDB();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await clearTestDB();
	});

	describe("addTenant", () => {
		it("creates the tenant and flips the vacant unit to Occupied with an embedded snapshot", async () => {
			const { userId } = await seedUser();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({
				userId,
				propertyId,
				name: "Flat 1",
			});

			const tenant = await addTenant({
				name: "Ada Lovelace",
				phone: "+2348011111111",
				email: "ada@example.test",
				unitId,
				userId,
				moveInDate: new Date("2026-01-10"),
				leaseExpiry: new Date("2027-01-09"),
				rentDueDay: 5,
			});

			expect(tenant).not.toBeNull();
			expect(tenant?.name).toBe("Ada Lovelace");
			expect(tenant?.propertyId).toBe(propertyId);
			expect(tenant?.status).toBe("Active");
			expect(tenant?.rentDueDay).toBe(5);

			const unit = await Unit.findById(unitId).lean();
			expect(unit?.status).toBe("Occupied");
			expect(unit?.tenant).toMatchObject({
				tenantId: tenant?.id,
				name: "Ada Lovelace",
			});

			// Fire-and-forget move-in notification lands as an in-app record.
			const note = await waitFor(() =>
				Notification.findOne({ userId, kind: "tenant-move-in" }).lean(),
			);
			expect(note.channel).toBe("in-app");
			expect(note.status).toBe("sent");
			expect(note.body).toContain("Ada Lovelace");
			expect(note.body).toContain("Flat 1");
		});

		it("rejects adding a second tenant to an already-occupied unit", async () => {
			const { userId } = await seedUser();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({ userId, propertyId });

			const first = await addTenant({
				name: "First Tenant",
				phone: "+2348022222222",
				email: "first@example.test",
				unitId,
				userId,
				moveInDate: new Date("2026-01-01"),
			});

			// The unit is now Occupied; a second addTenant must be refused so
			// the first tenant's occupancy is not silently overwritten.
			await expect(
				addTenant({
					name: "Second Tenant",
					phone: "+2348033333333",
					email: "second@example.test",
					unitId,
					userId,
					moveInDate: new Date("2026-02-01"),
				}),
			).rejects.toBe(ErrResourceAlreadyExist);

			// The unit still belongs to the first tenant, unchanged.
			const unit = await Unit.findById(unitId).lean();
			expect(unit?.status).toBe("Occupied");
			expect(unit?.tenant?.tenantId).toBe(first?.id);

			const firstDoc = await Tenant.findById(first?.id).lean();
			expect(firstDoc?.status).toBe("Active");
		});

		it("throws ErrUnitNotFound for a missing or foreign unit", async () => {
			const { userId } = await seedUser();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({ userId, propertyId });

			await expect(
				addTenant({
					name: "Nobody",
					phone: "+2348000000000",
					email: "nobody@example.test",
					unitId: newId(),
					userId,
					moveInDate: new Date(),
				}),
			).rejects.toBe(ErrUnitNotFound);

			await expect(
				addTenant({
					name: "Intruder",
					phone: "+2348000000001",
					email: "intruder@example.test",
					unitId,
					userId: newId(),
					moveInDate: new Date(),
				}),
			).rejects.toBe(ErrUnitNotFound);
		});

		it("aborts the transaction and throws when tenant creation fails (unit stays Vacant)", async () => {
			const { userId } = await seedUser();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({ userId, propertyId });

			// createTenantDB swallows the save error and returns null, which
			// drives addTenant's `if (!tenant)` abort-and-throw branch.
			vi.spyOn(Tenant.prototype, "save").mockRejectedValueOnce(
				new Error("save failed"),
			);

			await expect(
				addTenant({
					name: "Doomed Tenant",
					phone: "+2348055555555",
					email: "doomed@example.test",
					unitId,
					userId,
					moveInDate: new Date("2026-01-01"),
				}),
			).rejects.toBe(ErrUnitNotFound);

			// No tenant persisted and the unit was never flipped to Occupied.
			expect(await Tenant.countDocuments({ userId })).toBe(0);
			const unit = await Unit.findById(unitId).lean();
			expect(unit?.status).toBe("Vacant");
			expect(unit?.tenant ?? null).toBeNull();
		});

		it("aborts and rolls back when flipping the unit to Occupied throws mid-transaction", async () => {
			const { userId } = await seedUser();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({ userId, propertyId });

			// setUnitOccupiedDB does not swallow errors — a failure here throws
			// out of the try, exercising the catch's abort + rethrow. The tenant
			// insert done earlier in the transaction must be rolled back.
			const boom = new Error("occupancy update failed");
			vi.spyOn(Unit, "findByIdAndUpdate").mockRejectedValueOnce(boom);

			await expect(
				addTenant({
					name: "Rollback Rita",
					phone: "+2348066666666",
					email: "rita@example.test",
					unitId,
					userId,
					moveInDate: new Date("2026-01-01"),
				}),
			).rejects.toBe(boom);

			// Transaction aborted → the tenant created inside it is gone and the
			// unit is untouched.
			expect(await Tenant.countDocuments({ userId })).toBe(0);
			const unit = await Unit.findById(unitId).lean();
			expect(unit?.status).toBe("Vacant");
			expect(unit?.tenant ?? null).toBeNull();
		});
	});

	describe("updateTenant", () => {
		it("applies partial payloads only", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({ userId, propertyId });
			const { tenantId } = await seedTenant({
				userId,
				propertyId,
				unitId,
				name: "Before",
				phone: "+2348044444444",
			});

			const updated = await updateTenant({
				id: tenantId,
				userId,
				payload: { name: "After" },
			});
			expect(updated?.name).toBe("After");
			expect(updated?.phone).toBe("+2348044444444");
		});

		it("returns null when the tenant belongs to another owner", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({ userId, propertyId });
			const { tenantId } = await seedTenant({
				userId,
				propertyId,
				unitId,
			});

			const result = await updateTenant({
				id: tenantId,
				userId: newId(),
				payload: { name: "Nope" },
			});
			expect(result).toBeNull();
		});
	});

	describe("deleteTenant", () => {
		it("soft-deletes the tenant and vacates their unit (transactional)", async () => {
			const { userId } = await seedUser();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({
				userId,
				propertyId,
				name: "Flat 9",
			});
			const { tenantId } = await seedTenant({
				userId,
				propertyId,
				unitId,
				name: "Mover Out",
			});
			await Unit.findByIdAndUpdate(unitId, {
				$set: {
					status: "Occupied",
					tenant: { tenantId, name: "Mover Out" },
				},
			});

			await deleteTenant({ id: tenantId, userId });

			const tenantDoc = await Tenant.findById(tenantId).lean();
			expect(tenantDoc?.deleted).toBe(true);
			const unit = await Unit.findById(unitId).lean();
			expect(unit?.status).toBe("Vacant");
			expect(unit?.tenant).toBeNull();

			const note = await waitFor(() =>
				Notification.findOne({
					userId,
					kind: "tenant-move-out",
				}).lean(),
			);
			expect(note.body).toContain("Mover Out");
		});

		it("throws ErrTenantNotFound for unknown or foreign tenants", async () => {
			const userId = newId();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({ userId, propertyId });
			const { tenantId } = await seedTenant({
				userId,
				propertyId,
				unitId,
			});

			await expect(
				deleteTenant({ id: newId(), userId }),
			).rejects.toBe(ErrTenantNotFound);
			await expect(
				deleteTenant({ id: tenantId, userId: newId() }),
			).rejects.toBe(ErrTenantNotFound);
		});
	});

	describe("sendRentReminder", () => {
		it("creates a notification record for the tenant over the owner's enabled channels", async () => {
			// Default user settings: emailEnabled=true, smsEnabled=false →
			// with a tenant email present the reminder goes out via email.
			const { userId } = await seedUser();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({
				userId,
				propertyId,
				name: "Reminder Unit",
			});
			const { tenantId } = await seedTenant({
				userId,
				propertyId,
				unitId,
				name: "Late Larry",
				email: "larry@example.test",
			});

			const result = await sendRentReminder({ tenantId, userId });

			expect(result.sent).toBe(1);
			expect(result.failed).toBe(0);
			expect(result.tenant).toMatchObject({
				id: tenantId,
				name: "Late Larry",
			});

			const note = await Notification.findOne({
				userId,
				tenantId,
			}).lean();
			expect(note).not.toBeNull();
			expect(note?.kind).toBe("rent-due");
			expect(note?.channel).toBe("email");
			// No provider env configured → console transport marks it sent.
			expect(note?.status).toBe("sent");
			expect(note?.to).toBe("larry@example.test");
			expect(note?.title).toBe("Reminder: rent payment due");
			expect(note?.meta).toMatchObject({
				tenantName: "Late Larry",
				unitName: "Reminder Unit",
			});
		});

		it("uses the overdue wording for kind=rent-overdue", async () => {
			const { userId } = await seedUser();
			const { propertyId } = await seedProperty({ userId });
			const { unitId } = await seedUnit({ userId, propertyId });
			const { tenantId } = await seedTenant({
				userId,
				propertyId,
				unitId,
			});

			await sendRentReminder({ tenantId, userId, kind: "rent-overdue" });

			const note = await Notification.findOne({
				userId,
				tenantId,
			}).lean();
			expect(note?.kind).toBe("rent-overdue");
			expect(note?.title).toBe("Reminder: rent payment overdue");
			expect(note?.body).toContain("overdue");
		});

		it("throws ErrTenantNotFound for a missing tenant or missing owner", async () => {
			const { userId } = await seedUser();
			await expect(
				sendRentReminder({ tenantId: newId(), userId }),
			).rejects.toBe(ErrTenantNotFound);

			// Tenant exists but the owner user record does not.
			const ghostOwner = newId();
			const { propertyId } = await seedProperty({ userId: ghostOwner });
			const { unitId } = await seedUnit({
				userId: ghostOwner,
				propertyId,
			});
			const { tenantId } = await seedTenant({
				userId: ghostOwner,
				propertyId,
				unitId,
			});
			await expect(
				sendRentReminder({ tenantId, userId: ghostOwner }),
			).rejects.toBe(ErrTenantNotFound);
		});
	});
});
