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

import {
	createVendorDB,
	deleteVendorDB,
	getVendorByIdDB,
	getVendorsDB,
	updateVendorDB,
	Vendor,
} from "../../../src/server/models/vendors";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const USER = "user-vendors-1";
const OTHER = "user-vendors-2";

function payload(overrides: Record<string, unknown> = {}) {
	return {
		userId: USER,
		name: "Ace Plumbing",
		specialty: "plumbing" as const,
		company: "Ace Corp",
		...overrides,
	};
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

describe("createVendorDB", () => {
	it("creates a vendor and persists it", async () => {
		const vendor = await createVendorDB({ payload: payload({ rating: 4 }) });
		expect(vendor).not.toBeNull();
		expect(vendor?.id).toBeTruthy();
		expect(vendor?.rating).toBe(4);

		const inDb = await Vendor.findById(vendor?.id).lean();
		expect(inDb?.name).toBe("Ace Plumbing");
		expect(inDb?.deleted).toBe(false);
	});

	it("returns null on invalid specialty enum", async () => {
		expect(
			await createVendorDB({ payload: payload({ specialty: "alchemy" }) as never }),
		).toBeNull();
	});

	it("returns null when rating is out of range (max 5)", async () => {
		expect(await createVendorDB({ payload: payload({ rating: 7 }) })).toBeNull();
		expect(await Vendor.countDocuments({})).toBe(0);
	});
});

describe("getVendorsDB", () => {
	it("lists only the user's non-deleted vendors sorted by name asc", async () => {
		await createVendorDB({ payload: payload({ name: "Zeta" }) });
		await createVendorDB({ payload: payload({ name: "Alpha" }) });
		const gone = await createVendorDB({ payload: payload({ name: "Gone" }) });
		await deleteVendorDB({ id: gone!.id, userId: USER });
		await createVendorDB({ payload: payload({ name: "Foreign", userId: OTHER }) });

		const { vendors, total } = await getVendorsDB({ userId: USER });
		expect(total).toBe(2);
		expect(vendors.map((v) => v.name)).toEqual(["Alpha", "Zeta"]);
		expect(typeof vendors[0]?.id).toBe("string");
	});

	it("filters by specialty and treats 'all' as no filter", async () => {
		await createVendorDB({ payload: payload({ name: "P", specialty: "plumbing" }) });
		await createVendorDB({ payload: payload({ name: "E", specialty: "electrical" }) });

		const electric = await getVendorsDB({ userId: USER, specialty: "electrical" });
		expect(electric.vendors.map((v) => v.name)).toEqual(["E"]);

		const all = await getVendorsDB({ userId: USER, specialty: "all" });
		expect(all.total).toBe(2);
	});

	it("searches name and company case-insensitively", async () => {
		await createVendorDB({
			payload: payload({ name: "Bright Sparks", company: "Volt Ltd" }),
		});
		await createVendorDB({ payload: payload({ name: "Drain Kings", company: "Pipes Inc" }) });

		const byName = await getVendorsDB({ userId: USER, search: "sparks" });
		expect(byName.total).toBe(1);
		expect(byName.vendors[0]?.name).toBe("Bright Sparks");

		const byCompany = await getVendorsDB({ userId: USER, search: "PIPES" });
		expect(byCompany.total).toBe(1);
		expect(byCompany.vendors[0]?.name).toBe("Drain Kings");
	});

	it("treats regex metacharacters literally and does not throw", async () => {
		await createVendorDB({ payload: payload({ name: "Smith & Sons (24/7)" }) });
		await createVendorDB({ payload: payload({ name: "Smith and Sons 24 7" }) });

		const literal = await getVendorsDB({ userId: USER, search: "(24/7)" });
		expect(literal.total).toBe(1);
		expect(literal.vendors[0]?.name).toBe("Smith & Sons (24/7)");

		const wild = await getVendorsDB({ userId: USER, search: ".*" });
		expect(wild.total).toBe(0);
	});

	it("paginates with limit/offset and caps limit at MAX_LIMIT (50)", async () => {
		const docs = Array.from({ length: 55 }, (_, i) =>
			payload({ name: `V${String(i).padStart(2, "0")}` }),
		);
		await Vendor.insertMany(docs);

		const page = await getVendorsDB({ userId: USER, limit: 3, offset: 2 });
		expect(page.total).toBe(55);
		expect(page.vendors.map((v) => v.name)).toEqual(["V02", "V03", "V04"]);

		const capped = await getVendorsDB({ userId: USER, limit: 1000 });
		expect(capped.vendors).toHaveLength(50);
	});

	it("returns empty results for an unknown user", async () => {
		await createVendorDB({ payload: payload() });
		expect(await getVendorsDB({ userId: "ghost" })).toEqual({
			vendors: [],
			total: 0,
		});
	});

	it("returns empty results when the aggregate throws (catch path)", async () => {
		await createVendorDB({ payload: payload() });
		// A synchronous throw while building the Promise.allSettled array is
		// caught by the outer try, hitting the catch fallback.
		vi.spyOn(Vendor, "aggregate").mockImplementationOnce(() => {
			throw new Error("boom");
		});
		expect(await getVendorsDB({ userId: USER })).toEqual({
			vendors: [],
			total: 0,
		});
	});
});

describe("getVendorByIdDB", () => {
	it("returns the vendor for its owner", async () => {
		const vendor = await createVendorDB({ payload: payload() });
		const found = await getVendorByIdDB({ id: vendor!.id, userId: USER });
		expect(found?.id).toBe(vendor!.id);
		expect(found?.name).toBe("Ace Plumbing");
	});

	it("returns null for wrong owner, deleted vendor, or malformed id", async () => {
		const vendor = await createVendorDB({ payload: payload() });
		expect(await getVendorByIdDB({ id: vendor!.id, userId: OTHER })).toBeNull();

		await deleteVendorDB({ id: vendor!.id, userId: USER });
		expect(await getVendorByIdDB({ id: vendor!.id, userId: USER })).toBeNull();

		expect(await getVendorByIdDB({ id: "not-hex", userId: USER })).toBeNull();
	});
});

describe("updateVendorDB", () => {
	it("updates fields and persists", async () => {
		const vendor = await createVendorDB({ payload: payload() });
		const updated = await updateVendorDB({
			id: vendor!.id,
			userId: USER,
			payload: { name: "New Name", rating: 5 },
		});
		expect(updated?.name).toBe("New Name");
		expect(updated?.rating).toBe(5);
		const inDb = await Vendor.findById(vendor!.id).lean();
		expect(inDb?.name).toBe("New Name");
	});

	it("returns null for wrong owner or unknown id", async () => {
		const vendor = await createVendorDB({ payload: payload() });
		expect(
			await updateVendorDB({ id: vendor!.id, userId: OTHER, payload: { name: "X" } }),
		).toBeNull();
		expect(
			await updateVendorDB({
				id: new mongoose.Types.ObjectId().toString(),
				userId: USER,
				payload: { name: "X" },
			}),
		).toBeNull();
		const inDb = await Vendor.findById(vendor!.id).lean();
		expect(inDb?.name).toBe("Ace Plumbing");
	});

	it("returns null when the update query throws (catch path)", async () => {
		const vendor = await createVendorDB({ payload: payload() });
		vi.spyOn(Vendor, "findOneAndUpdate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(
			await updateVendorDB({
				id: vendor!.id,
				userId: USER,
				payload: { name: "X" },
			}),
		).toBeNull();
	});
});

describe("deleteVendorDB", () => {
	it("soft-deletes and returns true; repeat delete returns false", async () => {
		const vendor = await createVendorDB({ payload: payload() });
		expect(await deleteVendorDB({ id: vendor!.id, userId: USER })).toBe(true);
		const inDb = await Vendor.findById(vendor!.id).lean();
		expect(inDb?.deleted).toBe(true);
		expect(await deleteVendorDB({ id: vendor!.id, userId: USER })).toBe(false);
	});

	it("returns false for wrong owner or malformed id", async () => {
		const vendor = await createVendorDB({ payload: payload() });
		expect(await deleteVendorDB({ id: vendor!.id, userId: OTHER })).toBe(false);
		expect(await deleteVendorDB({ id: "bad", userId: USER })).toBe(false);
		const inDb = await Vendor.findById(vendor!.id).lean();
		expect(inDb?.deleted).toBe(false);
	});
});
