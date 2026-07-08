import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createAuditEventDB, createOrganizationDB } from "../../../src/server/models";
import {
	getPlatformAnalytics,
	getPlatformOrganizationDetail,
	getPlatformOrganizations,
	getPlatformOverview,
	listPlatformAudit,
	setOrganizationSuspended,
} from "../../../src/server/services/platform";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const oid = () => new mongoose.Types.ObjectId().toString();

async function makeUser(name: string): Promise<string> {
	const id = new mongoose.Types.ObjectId();
	const u = await mongoose.models.users.create({
		_id: id,
		username: `u_${id.toString()}`,
		email: `${id.toString()}@example.test`,
		password: "hashed",
		name,
	});
	return u._id.toString();
}

async function makeOrg(ownerId: string): Promise<string> {
	const org = await createOrganizationDB({
		payload: {
			ownerId: new mongoose.Types.ObjectId(ownerId),
			name: `org-${oid()}`,
			description: "seeded org",
		} as never,
	});
	return (org as unknown as { _id: mongoose.Types.ObjectId })._id.toString();
}

async function makeProperty(userId: string): Promise<string> {
	const p = await mongoose.models.properties.create({
		name: `prop-${oid()}`,
		address: "1 Test St",
		type: "Apartment",
		totalUnits: 2,
		monthlyRent: 1000,
		userId,
	});
	return p._id.toString();
}

async function makeUnit(
	userId: string,
	propertyId: string,
	status: "Occupied" | "Vacant",
	rent: number,
): Promise<void> {
	await mongoose.models.units.create({
		name: `unit-${oid()}`,
		rent,
		propertyId,
		userId,
		status,
	});
}

async function makeTenant(
	userId: string,
	propertyId: string,
): Promise<string> {
	const t = await mongoose.models.tenants.create({
		name: `tenant-${oid()}`,
		phone: "123",
		email: `${oid()}@t.test`,
		unitId: oid(),
		propertyId,
		userId,
		moveInDate: new Date(),
		status: "Active",
	});
	return t._id.toString();
}

async function makeTransaction(
	userId: string,
	tenantId: string,
	amount: number,
	amountType: "credit" | "debit",
): Promise<void> {
	await mongoose.models.transactions.create({
		tenantId,
		userId,
		type: "rent",
		description: "rent",
		amount,
		amountType,
		paymentMethod: "cash",
		date: new Date(),
	});
}

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterAll(async () => {
	await dropTestDB();
});

describe("getPlatformOverview", () => {
	it("aggregates real counts, revenue and occupancy across all tenants", async () => {
		const owner = await makeUser("Owner A");
		await makeOrg(owner);
		const prop = await makeProperty(owner);
		await makeUnit(owner, prop, "Occupied", 1200);
		await makeUnit(owner, prop, "Vacant", 900);
		const tenant = await makeTenant(owner, prop);
		await makeTransaction(owner, tenant, 1200, "credit");
		await makeTransaction(owner, tenant, 300, "debit");

		const o = await getPlatformOverview({ refreshCache: true });
		expect(o.organizations).toBe(1);
		expect(o.users).toBeGreaterThanOrEqual(1);
		expect(o.properties).toBe(1);
		expect(o.units).toBe(2);
		expect(o.occupiedUnits).toBe(1);
		expect(o.vacantUnits).toBe(1);
		expect(o.tenants).toBe(1);
		expect(o.totalRevenue).toBe(1200);
		expect(o.monthlyRecurringRevenue).toBe(1200); // occupied unit rent
		expect(o.occupancyRate).toBe(50);
		expect(o.orgGrowth).toHaveLength(6);
	});
});

describe("getPlatformOrganizations + detail + suspend", () => {
	it("lists orgs with owner + counts, and keeps suspended orgs visible", async () => {
		const owner = await makeUser("Owner B");
		const orgId = await makeOrg(owner);
		const prop = await makeProperty(owner);
		await makeTenant(owner, prop);

		const listed = await getPlatformOrganizations({ limit: 20 });
		const row = listed.organizations.find((r) => r.id === orgId);
		expect(row).toBeDefined();
		expect(row?.owner?.name).toBe("Owner B");
		expect(row?.memberCount).toBe(1);
		expect(row?.propertyCount).toBe(1);
		expect(row?.tenantCount).toBe(1);
		expect(row?.suspended).toBe(false);

		// Suspend → still listed, now flagged; overview org count drops.
		expect(
			await setOrganizationSuspended({ orgId, suspended: true }),
		).toEqual({ id: orgId, suspended: true });
		const afterSuspend = await getPlatformOrganizations({ limit: 20 });
		expect(
			afterSuspend.organizations.find((r) => r.id === orgId)?.suspended,
		).toBe(true);
		expect((await getPlatformOverview({ refreshCache: true })).organizations).toBe(
			0,
		);

		// Reactivate.
		await setOrganizationSuspended({ orgId, suspended: false });
		expect((await getPlatformOverview({ refreshCache: true })).organizations).toBe(
			1,
		);
	});

	it("returns full detail with owner-scoped stats", async () => {
		const owner = await makeUser("Owner C");
		const orgId = await makeOrg(owner);
		const prop = await makeProperty(owner);
		await makeUnit(owner, prop, "Occupied", 1000);
		const tenant = await makeTenant(owner, prop);
		await makeTransaction(owner, tenant, 500, "credit");

		const detail = await getPlatformOrganizationDetail({ orgId });
		expect(detail).not.toBeNull();
		expect(detail?.owner?.name).toBe("Owner C");
		expect(detail?.stats.properties).toBe(1);
		expect(detail?.stats.units).toBe(1);
		expect(detail?.stats.occupiedUnits).toBe(1);
		expect(detail?.stats.tenants).toBe(1);
		expect(detail?.stats.revenue).toBe(500);
	});

	it("returns null detail for an unknown org id", async () => {
		expect(
			await getPlatformOrganizationDetail({ orgId: oid() }),
		).toBeNull();
	});
});

describe("getPlatformAnalytics", () => {
	it("computes cross-tenant monthly revenue, top orgs and occupancy", async () => {
		const owner = await makeUser("Owner D");
		const orgId = await makeOrg(owner);
		const prop = await makeProperty(owner);
		await makeUnit(owner, prop, "Occupied", 1000);
		const tenant = await makeTenant(owner, prop);
		await makeTransaction(owner, tenant, 800, "credit");
		await makeTransaction(owner, tenant, 200, "debit");

		const a = await getPlatformAnalytics({ months: 6 });
		expect(a.monthly).toHaveLength(6);
		const totalRevenue = a.monthly.reduce((s, m) => s + m.revenue, 0);
		expect(totalRevenue).toBe(800);
		expect(a.occupancy.occupied).toBe(1);
		const top = a.topOrganizations.find((t) => t.orgId === orgId);
		expect(top?.revenue).toBe(800);
	});
});

describe("platform edge cases", () => {
	it("filters org list by search and tolerates a missing owner user", async () => {
		const owner = await makeUser("Owner E");
		const uniqueName = `findme-${oid()}`;
		await createOrganizationDB({
			payload: {
				ownerId: new mongoose.Types.ObjectId(owner),
				name: uniqueName,
				description: "searchable",
			} as never,
		});
		// An org whose owner is not a real user → owner enrichment must be null.
		const orphanOrg = await makeOrg(oid());

		const found = await getPlatformOrganizations({ search: uniqueName });
		expect(found.organizations.some((o) => o.name === uniqueName)).toBe(true);

		const orphanRow = (await getPlatformOrganizations({ limit: 100 })).organizations.find(
			(o) => o.id === orphanOrg,
		);
		expect(orphanRow?.owner).toBeNull();
	});

	it("reads the cached overview on a second call without refresh", async () => {
		const owner = await makeUser("Owner F");
		await makeOrg(owner);
		const fresh = await getPlatformOverview({ refreshCache: true });
		const cached = await getPlatformOverview(); // cache path
		expect(cached.organizations).toBe(fresh.organizations);
	});

	it("returns null when suspending a nonexistent org, and zeros for empty analytics", async () => {
		expect(
			await setOrganizationSuspended({ orgId: oid(), suspended: true }),
		).toBeNull();

		const a = await getPlatformAnalytics({ months: 3 });
		expect(a.monthly).toHaveLength(3);
		expect(a.monthly.every((m) => m.revenue === 0 && m.expenses === 0)).toBe(
			true,
		);
		expect(a.topOrganizations).toEqual([]);
		expect(a.occupancy).toEqual({ occupied: 0, vacant: 0 });
	});
});

describe("listPlatformAudit", () => {
	it("returns events across ALL owners and filters by ownerId", async () => {
		const ownerA = oid();
		const ownerB = oid();
		await createAuditEventDB({
			payload: {
				ownerId: ownerA,
				actorId: ownerA,
				action: "create",
				entityType: "property",
			},
		});
		await createAuditEventDB({
			payload: {
				ownerId: ownerB,
				actorId: ownerB,
				action: "delete",
				entityType: "tenant",
			},
		});

		const all = await listPlatformAudit({ limit: 50 });
		expect(all.total).toBeGreaterThanOrEqual(2);
		const owners = new Set(all.events.map((e) => e.ownerId));
		expect(owners.has(ownerA)).toBe(true);
		expect(owners.has(ownerB)).toBe(true);

		const onlyA = await listPlatformAudit({ ownerId: ownerA });
		expect(onlyA.events.every((e) => e.ownerId === ownerA)).toBe(true);
	});
});
