import mongoose from "mongoose";
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
import { createOrganizationDB } from "../../../src/server/models";
import {
	getPlatformAnalytics,
	getPlatformOrganizationDetail,
	getPlatformOrganizations,
	getPlatformOverview,
} from "../../../src/server/services/platform";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

// The operator dashboard must degrade gracefully — a failing collection query
// yields zeros/empties, never a thrown 500. We force real DB errors by making
// specific model methods reject and assert the services still return safe shapes.

const oid = () => new mongoose.Types.ObjectId().toString();

async function makeOrg(): Promise<string> {
	const org = await createOrganizationDB({
		payload: {
			ownerId: new mongoose.Types.ObjectId(oid()),
			name: `org-${oid()}`,
			description: "seed",
		} as never,
	});
	return (org as unknown as { _id: mongoose.Types.ObjectId })._id.toString();
}

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterEach(() => {
	vi.restoreAllMocks();
});
afterAll(async () => {
	await dropTestDB();
});

describe("platform services degrade gracefully on DB failure", () => {
	it("overview returns zeros when count/aggregate queries reject", async () => {
		vi.spyOn(
			mongoose.models.organizations,
			"countDocuments",
		).mockRejectedValue(new Error("db down") as never);
		vi.spyOn(mongoose.models.transactions, "aggregate").mockRejectedValue(
			new Error("db down") as never,
		);
		const o = await getPlatformOverview({ refreshCache: true });
		expect(o.organizations).toBe(0);
		expect(o.totalRevenue).toBe(0);
	});

	it("org list returns an empty page when the query rejects", async () => {
		vi.spyOn(
			mongoose.models.organizations,
			"countDocuments",
		).mockRejectedValue(new Error("db down") as never);
		expect(await getPlatformOrganizations({ limit: 10 })).toEqual({
			organizations: [],
			total: 0,
		});
	});

	it("org detail returns null on a malformed id and tolerates stat-query failures", async () => {
		expect(
			await getPlatformOrganizationDetail({ orgId: "not-an-oid" }),
		).toBeNull();

		const orgId = await makeOrg();
		vi.spyOn(
			mongoose.models.properties,
			"countDocuments",
		).mockRejectedValue(new Error("db down") as never);
		vi.spyOn(mongoose.models.transactions, "aggregate").mockRejectedValue(
			new Error("db down") as never,
		);
		const detail = await getPlatformOrganizationDetail({ orgId });
		expect(detail?.stats.properties).toBe(0);
		expect(detail?.stats.revenue).toBe(0);
	});

	it("analytics returns safe empties when aggregates reject", async () => {
		vi.spyOn(mongoose.models.transactions, "aggregate").mockRejectedValue(
			new Error("db down") as never,
		);
		vi.spyOn(mongoose.models.units, "aggregate").mockRejectedValue(
			new Error("db down") as never,
		);
		vi.spyOn(
			mongoose.models.maintenancerequests,
			"aggregate",
		).mockRejectedValue(new Error("db down") as never);
		const a = await getPlatformAnalytics({ months: 6 });
		expect(a.topOrganizations).toEqual([]);
		expect(a.occupancy).toEqual({ occupied: 0, vacant: 0 });
		expect(a.maintenanceByCategory).toEqual([]);
	});
});
