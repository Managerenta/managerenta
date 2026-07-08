import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	createTenantDB,
	createTransactionDB,
	deleteTenantDB,
	getTenantByIdDB,
	getTenantIdsByPropertyIdDB,
	getTenantsByIdsDB,
	getTenantsByUnitIdDB,
	getTenantsDB,
	getTenantStatsDB,
	softDeleteTenantsByPropertyDB,
	Tenant,
	updateTenantDB,
} from "../../../src/server/models/tenants";
import type { ITenantCreateInput } from "../../../src/server/models/tenants/types";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const USER = "owner-user-1";
const OTHER_USER = "other-user-2";
const unknownId = () => new mongoose.Types.ObjectId().toString();

function tenantPayload(
	n: number,
	extra: Partial<ITenantCreateInput> = {},
): ITenantCreateInput {
	return {
		name: `Tenant ${n}`,
		phone: `+23480000000${n}`,
		email: `tenant${n}@example.com`,
		unitId: `unit-${n}`,
		propertyId: "property-1",
		userId: USER,
		moveInDate: new Date(2025, 0, 1),
		...extra,
	};
}

async function makeTenant(n: number, extra: Partial<ITenantCreateInput> = {}) {
	const tenant = await createTenantDB({ payload: tenantPayload(n, extra) });
	expect(tenant).not.toBeNull();
	// biome-ignore lint/style/noNonNullAssertion: asserted above
	return tenant!;
}

beforeAll(async () => {
	expect(process.env.DB_NAME).toMatch(/^managerenta-vitest/);
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterAll(async () => {
	await dropTestDB();
});

describe("createTenantDB", () => {
	it("creates a tenant with defaults (Active, rentDueDay 1) and a string id", async () => {
		const tenant = await makeTenant(1);
		expect(tenant.id).toBeTruthy();
		expect(tenant.status).toBe("Active");
		expect(tenant.rentDueDay).toBe(1);
		const raw = await Tenant.findById(tenant.id);
		expect(raw?.name).toBe("Tenant 1");
		expect(raw?.deleted).toBe(false);
	});

	it("returns null when required fields are missing", async () => {
		const tenant = await createTenantDB({
			payload: { name: "No phone" } as never,
		});
		expect(tenant).toBeNull();
		expect(await Tenant.countDocuments()).toBe(0);
	});

	it("returns null when rentDueDay is out of range (max 28)", async () => {
		const tenant = await createTenantDB({
			payload: tenantPayload(2, { rentDueDay: 31 }),
		});
		expect(tenant).toBeNull();
	});
});

describe("getTenantsDB", () => {
	it("scopes results to the owning user", async () => {
		await makeTenant(1);
		await makeTenant(2, { userId: OTHER_USER });
		const mine = await getTenantsDB({ userId: USER });
		expect(mine.tenants).toHaveLength(1);
		expect(mine.total).toBe(1);
		expect(mine.tenants[0].name).toBe("Tenant 1");

		const nobody = await getTenantsDB({ userId: "stranger" });
		expect(nobody.tenants).toEqual([]);
		expect(nobody.total).toBe(0);
	});

	it("filters by status, and 'all' returns every status", async () => {
		const active = await makeTenant(1);
		const inactive = await makeTenant(2);
		await Tenant.updateOne(
			{ _id: inactive.id },
			{ $set: { status: "Inactive" } },
		);

		const activeOnly = await getTenantsDB({ userId: USER, status: "Active" });
		expect(activeOnly.tenants.map((t) => t.name)).toEqual([active.name]);
		expect(activeOnly.total).toBe(1);

		const inactiveOnly = await getTenantsDB({
			userId: USER,
			status: "Inactive",
		});
		expect(inactiveOnly.tenants.map((t) => t.name)).toEqual(["Tenant 2"]);

		const all = await getTenantsDB({ userId: USER, status: "all" });
		expect(all.total).toBe(2);
	});

	it("searches across name, email, and phone", async () => {
		await makeTenant(1, { name: "Alice Johnson" });
		await makeTenant(2, { email: "special-needle@example.com" });
		await makeTenant(3, { phone: "+15550001111" });

		const byName = await getTenantsDB({ userId: USER, search: "alice" });
		expect(byName.tenants.map((t) => t.name)).toEqual(["Alice Johnson"]);
		expect(byName.total).toBe(1);

		const byEmail = await getTenantsDB({
			userId: USER,
			search: "special-needle",
		});
		expect(byEmail.total).toBe(1);

		// "+1555" contains a regex metacharacter; escaping makes it a literal.
		const byPhone = await getTenantsDB({ userId: USER, search: "+1555" });
		expect(byPhone.total).toBe(1);
		expect(byPhone.tenants[0].phone).toBe("+15550001111");
	});

	it("a ReDoS-style search does not crash and matches nothing", async () => {
		await makeTenant(1);
		const result = await getTenantsDB({ userId: USER, search: "(a+)+$" });
		expect(result.tenants).toEqual([]);
		expect(result.total).toBe(0);
	});

	it("sorts by name ascending or createdAt descending", async () => {
		const b = await makeTenant(1, { name: "Bravo" });
		const a = await makeTenant(2, { name: "Alpha" });
		await Tenant.collection.updateOne(
			{ _id: new mongoose.Types.ObjectId(b.id) },
			{ $set: { createdAt: new Date(2026, 0, 2) } },
		);
		await Tenant.collection.updateOne(
			{ _id: new mongoose.Types.ObjectId(a.id) },
			{ $set: { createdAt: new Date(2026, 0, 1) } },
		);

		const byName = await getTenantsDB({ userId: USER, sort: "name" });
		expect(byName.tenants.map((t) => t.name)).toEqual(["Alpha", "Bravo"]);

		const byRecent = await getTenantsDB({ userId: USER, sort: "recent" });
		expect(byRecent.tenants.map((t) => t.name)).toEqual(["Bravo", "Alpha"]);
	});

	it("paginates with offset/limit while total reflects the full match", async () => {
		await makeTenant(1, { name: "A" });
		await makeTenant(2, { name: "B" });
		await makeTenant(3, { name: "C" });

		const page1 = await getTenantsDB({ userId: USER, limit: 2, offset: 0 });
		expect(page1.tenants.map((t) => t.name)).toEqual(["A", "B"]);
		expect(page1.total).toBe(3);

		const page2 = await getTenantsDB({ userId: USER, limit: 2, offset: 2 });
		expect(page2.tenants.map((t) => t.name)).toEqual(["C"]);
		expect(page2.total).toBe(3);
	});

	it("excludes soft-deleted tenants from both list and total", async () => {
		const t1 = await makeTenant(1);
		await makeTenant(2);
		await deleteTenantDB({ id: t1.id, userId: USER });
		const result = await getTenantsDB({ userId: USER });
		expect(result.tenants.map((t) => t.name)).toEqual(["Tenant 2"]);
		expect(result.total).toBe(1);
	});
});

describe("getTenantByIdDB", () => {
	it("returns the tenant for its owner", async () => {
		const tenant = await makeTenant(1);
		const found = await getTenantByIdDB({ id: tenant.id, userId: USER });
		expect(found?.name).toBe("Tenant 1");
		expect(found?.id).toBe(tenant.id);
	});

	it("returns null for the wrong user (ownership scoping)", async () => {
		const tenant = await makeTenant(2);
		expect(
			await getTenantByIdDB({ id: tenant.id, userId: OTHER_USER }),
		).toBeNull();
	});

	it("returns null for unknown or soft-deleted tenants", async () => {
		expect(await getTenantByIdDB({ id: unknownId(), userId: USER })).toBeNull();
		const tenant = await makeTenant(3);
		await deleteTenantDB({ id: tenant.id, userId: USER });
		expect(await getTenantByIdDB({ id: tenant.id, userId: USER })).toBeNull();
	});
});

describe("updateTenantDB", () => {
	it("updates fields and returns the after-document", async () => {
		const tenant = await makeTenant(1);
		const result = await updateTenantDB({
			id: tenant.id,
			userId: USER,
			payload: { name: "Renamed Tenant", rentDueDay: 15 },
		});
		expect(result?.name).toBe("Renamed Tenant");
		expect(result?.rentDueDay).toBe(15);
		const raw = await Tenant.findById(tenant.id);
		expect(raw?.name).toBe("Renamed Tenant");
	});

	it("returns null for the wrong user and leaves the doc unchanged", async () => {
		const tenant = await makeTenant(2);
		const result = await updateTenantDB({
			id: tenant.id,
			userId: OTHER_USER,
			payload: { name: "Hijacked" },
		});
		expect(result).toBeNull();
		const raw = await Tenant.findById(tenant.id);
		expect(raw?.name).toBe("Tenant 2");
	});

	it("returns null for soft-deleted tenants", async () => {
		const tenant = await makeTenant(3);
		await deleteTenantDB({ id: tenant.id, userId: USER });
		expect(
			await updateTenantDB({
				id: tenant.id,
				userId: USER,
				payload: { name: "Zombie" },
			}),
		).toBeNull();
	});
});

describe("deleteTenantDB", () => {
	it("soft-deletes and returns unitId + name", async () => {
		const tenant = await makeTenant(1);
		const result = await deleteTenantDB({ id: tenant.id, userId: USER });
		expect(result).toEqual({ unitId: "unit-1", name: "Tenant 1" });
		const raw = await Tenant.findById(tenant.id);
		expect(raw?.deleted).toBe(true);
	});

	it("returns null on double-delete and for the wrong user", async () => {
		const tenant = await makeTenant(2);
		expect(
			await deleteTenantDB({ id: tenant.id, userId: OTHER_USER }),
		).toBeNull();
		expect(await deleteTenantDB({ id: tenant.id, userId: USER })).not.toBeNull();
		expect(await deleteTenantDB({ id: tenant.id, userId: USER })).toBeNull();
	});
});

describe("softDeleteTenantsByPropertyDB", () => {
	it("soft-deletes only the user's tenants in the property and marks them Inactive", async () => {
		await makeTenant(1, { propertyId: "prop-A" });
		await makeTenant(2, { propertyId: "prop-A" });
		await makeTenant(3, { propertyId: "prop-B" });
		const foreign = await makeTenant(4, {
			propertyId: "prop-A",
			userId: OTHER_USER,
		});

		const count = await softDeleteTenantsByPropertyDB({
			propertyId: "prop-A",
			userId: USER,
		});
		expect(count).toBe(2);

		const deleted = await Tenant.find({ propertyId: "prop-A", userId: USER });
		for (const t of deleted) {
			expect(t.deleted).toBe(true);
			expect(t.status).toBe("Inactive");
		}
		const untouchedForeign = await Tenant.findById(foreign.id);
		expect(untouchedForeign?.deleted).toBe(false);
		const otherProp = await Tenant.findOne({ propertyId: "prop-B" });
		expect(otherProp?.deleted).toBe(false);
	});
});

describe("getTenantsByUnitIdDB", () => {
	it("returns tenants for a unit and excludes soft-deleted", async () => {
		const t1 = await makeTenant(1, { unitId: "shared-unit" });
		await makeTenant(2, { unitId: "shared-unit" });
		await makeTenant(3, { unitId: "other-unit" });
		await deleteTenantDB({ id: t1.id, userId: USER });

		const result = await getTenantsByUnitIdDB({ unitId: "shared-unit" });
		expect(result.map((t) => t.name)).toEqual(["Tenant 2"]);
	});
});

describe("getTenantStatsDB", () => {
	it("computes totals, active, expiring leases, and overdue payments", async () => {
		const now = new Date();
		const in10Days = new Date(now.getTime() + 10 * 24 * 3600_000);
		const in60Days = new Date(now.getTime() + 60 * 24 * 3600_000);

		// Paid this month → not overdue; lease expiring within 30 days.
		const paid = await makeTenant(1, {
			leaseExpiry: in10Days,
			rentDueDay: 1,
		});
		await createTransactionDB({
			payload: {
				tenantId: paid.id,
				userId: USER,
				type: "rent",
				description: "July rent",
				amount: 1000,
				amountType: "credit",
				paymentMethod: "cash",
				date: now,
			},
		});

		// No rent credit this month → overdue (rentDueDay 1 is always past
		// once the month has started); lease far in the future.
		await makeTenant(2, { leaseExpiry: in60Days, rentDueDay: 1 });

		// Inactive tenant counts toward total only.
		const inactive = await makeTenant(3);
		await Tenant.updateOne(
			{ _id: inactive.id },
			{ $set: { status: "Inactive" } },
		);

		const stats = await getTenantStatsDB({ userId: USER });
		expect(stats.totalTenants).toBe(3);
		expect(stats.activeTenants).toBe(2);
		expect(stats.expiringLeases).toBe(1);
		expect(stats.overduePayments).toBe(1);
	});

	it("returns zeros for a user with no tenants", async () => {
		expect(await getTenantStatsDB({ userId: "empty-user" })).toEqual({
			totalTenants: 0,
			activeTenants: 0,
			expiringLeases: 0,
			overduePayments: 0,
		});
	});
});

describe("getTenantIdsByPropertyIdDB", () => {
	it("returns ids scoped to user + property, excluding soft-deleted", async () => {
		const t1 = await makeTenant(1, { propertyId: "prop-X" });
		const t2 = await makeTenant(2, { propertyId: "prop-X" });
		await makeTenant(3, { propertyId: "prop-Y" });
		await makeTenant(4, { propertyId: "prop-X", userId: OTHER_USER });
		await deleteTenantDB({ id: t2.id, userId: USER });

		const ids = await getTenantIdsByPropertyIdDB({
			propertyId: "prop-X",
			userId: USER,
		});
		expect(ids).toEqual([t1.id]);
	});
});

describe("getTenantsByIdsDB", () => {
	it("returns [] for an empty id list without touching the DB", async () => {
		expect(await getTenantsByIdsDB({ ids: [] })).toEqual([]);
	});

	it("scopes by userId when provided", async () => {
		const mine = await makeTenant(1);
		const foreign = await makeTenant(2, { userId: OTHER_USER });
		const scoped = await getTenantsByIdsDB({
			ids: [mine.id, foreign.id],
			userId: USER,
		});
		expect(scoped.map((t) => t.name)).toEqual(["Tenant 1"]);

		const unscoped = await getTenantsByIdsDB({ ids: [mine.id, foreign.id] });
		expect(unscoped).toHaveLength(2);
	});

	it("excludes soft-deleted tenants", async () => {
		const t1 = await makeTenant(1);
		await deleteTenantDB({ id: t1.id, userId: USER });
		expect(await getTenantsByIdsDB({ ids: [t1.id], userId: USER })).toEqual(
			[],
		);
	});
});
