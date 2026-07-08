import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: vi.fn(async () => "https://fake-s3.example/signed-url"),
}));

import {
	createPropertyDB,
	decrementPropertyTotalUnitsDB,
	deletePropertyDB,
	getPropertiesByIdsDB,
	getPropertiesDB,
	getPropertyByIdDB,
	getPropertyStatsDB,
	incrementPropertyTotalUnitsDB,
	Property,
	updatePropertyDB,
} from "../../../src/server/models/properties";
import { Unit } from "../../../src/server/models/units";
import { disconnectRedis } from "../../../src/server/databases";
import {
	clearTestDB,
	connectTestDB,
	dropTestDB,
} from "../../helpers/db";

const USER = "user-props-1";
const OTHER = "user-props-2";

function payload(overrides: Record<string, unknown> = {}) {
	return {
		name: "Sunset Villa",
		address: "12 Palm Street",
		type: "Apartment" as const,
		totalUnits: 4,
		monthlyRent: 1200,
		userId: USER,
		...overrides,
	};
}

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterAll(async () => {
	await dropTestDB();
	await disconnectRedis().catch(() => {});
});

describe("createPropertyDB", () => {
	it("creates a property and persists it", async () => {
		const result = await createPropertyDB({ payload: payload() });
		expect(result).not.toBeNull();
		expect(result?.id).toBeTruthy();
		expect(result?.name).toBe("Sunset Villa");
		expect(result?.deleted).toBe(false);

		const inDb = await Property.findById(result?.id).lean();
		expect(inDb).not.toBeNull();
		expect(inDb?.userId).toBe(USER);
		expect(inDb?.totalUnits).toBe(4);
	});

	it("returns null when required fields are missing", async () => {
		const result = await createPropertyDB({
			// name/address missing -> mongoose validation error
			payload: { type: "House", userId: USER } as never,
		});
		expect(result).toBeNull();
		expect(await Property.countDocuments({})).toBe(0);
	});

	it("returns null when the type enum is invalid", async () => {
		const result = await createPropertyDB({
			payload: payload({ type: "Castle" }) as never,
		});
		expect(result).toBeNull();
	});
});

describe("getPropertiesDB", () => {
	it("returns only the user's non-deleted properties with total", async () => {
		await createPropertyDB({ payload: payload({ name: "A" }) });
		await createPropertyDB({ payload: payload({ name: "B" }) });
		const del = await createPropertyDB({ payload: payload({ name: "C" }) });
		await deletePropertyDB({ id: del!.id, userId: USER });
		await createPropertyDB({ payload: payload({ name: "X", userId: OTHER }) });

		const { properties, total } = await getPropertiesDB({ userId: USER });
		expect(total).toBe(2);
		expect(properties.map((p) => p.name).sort()).toEqual(["A", "B"]);
		// pre-aggregate hook strips internals and adds string id
		for (const p of properties) {
			expect(typeof p.id).toBe("string");
			expect((p as never as { deleted?: boolean }).deleted).toBeUndefined();
			expect((p as never as { __v?: number }).__v).toBeUndefined();
		}
	});

	it("returns empty for a user with no properties", async () => {
		const { properties, total } = await getPropertiesDB({ userId: "nobody" });
		expect(properties).toEqual([]);
		expect(total).toBe(0);
	});

	it("filters by type and treats 'all' as no filter", async () => {
		await createPropertyDB({ payload: payload({ name: "Apt", type: "Apartment" }) });
		await createPropertyDB({ payload: payload({ name: "Hse", type: "House" }) });

		const houses = await getPropertiesDB({ userId: USER, type: "House" });
		expect(houses.total).toBe(1);
		expect(houses.properties[0]?.name).toBe("Hse");

		const all = await getPropertiesDB({ userId: USER, type: "all" });
		expect(all.total).toBe(2);
	});

	it("searches name and address case-insensitively", async () => {
		await createPropertyDB({
			payload: payload({ name: "Lakeside Manor", address: "9 River Road" }),
		});
		await createPropertyDB({
			payload: payload({ name: "Hilltop", address: "1 Mountain Ave" }),
		});

		const byName = await getPropertiesDB({ userId: USER, search: "lakeside" });
		expect(byName.total).toBe(1);
		expect(byName.properties[0]?.name).toBe("Lakeside Manor");

		const byAddress = await getPropertiesDB({ userId: USER, search: "MOUNTAIN" });
		expect(byAddress.total).toBe(1);
		expect(byAddress.properties[0]?.name).toBe("Hilltop");
	});

	it("treats regex metacharacters in search literally and does not throw", async () => {
		await createPropertyDB({ payload: payload({ name: "Block (A) [1]" }) });
		await createPropertyDB({ payload: payload({ name: "Block A 1" }) });

		const literal = await getPropertiesDB({ userId: USER, search: "(A) [1]" });
		expect(literal.total).toBe(1);
		expect(literal.properties[0]?.name).toBe("Block (A) [1]");

		// ".*" must not act as a wildcard
		const wild = await getPropertiesDB({ userId: USER, search: ".*" });
		expect(wild.total).toBe(0);
	});

	it("supports sort orders: name asc, units desc, revenue desc, default createdAt desc", async () => {
		await Property.create({
			...payload({ name: "Bravo", totalUnits: 5, monthlyRent: 100 }),
			createdAt: new Date("2024-01-01"),
		});
		await Property.create({
			...payload({ name: "Alpha", totalUnits: 9, monthlyRent: 50 }),
			createdAt: new Date("2024-02-01"),
		});
		await Property.create({
			...payload({ name: "Charlie", totalUnits: 1, monthlyRent: 900 }),
			createdAt: new Date("2024-03-01"),
		});

		const byName = await getPropertiesDB({ userId: USER, sort: "name" });
		expect(byName.properties.map((p) => p.name)).toEqual([
			"Alpha",
			"Bravo",
			"Charlie",
		]);

		const byUnits = await getPropertiesDB({ userId: USER, sort: "units" });
		expect(byUnits.properties.map((p) => p.name)).toEqual([
			"Alpha",
			"Bravo",
			"Charlie",
		]);

		const byRevenue = await getPropertiesDB({ userId: USER, sort: "revenue" });
		expect(byRevenue.properties.map((p) => p.name)).toEqual([
			"Charlie",
			"Bravo",
			"Alpha",
		]);

		// "occupancy" falls through to default createdAt desc
		const byDefault = await getPropertiesDB({ userId: USER, sort: "occupancy" });
		expect(byDefault.properties.map((p) => p.name)).toEqual([
			"Charlie",
			"Alpha",
			"Bravo",
		]);
	});

	it("paginates with limit and offset while total stays the full count", async () => {
		for (let i = 0; i < 5; i++) {
			await Property.create({
				...payload({ name: `P${i}` }),
				createdAt: new Date(2024, 0, i + 1),
			});
		}
		const page = await getPropertiesDB({ userId: USER, limit: 2, offset: 2 });
		expect(page.total).toBe(5);
		expect(page.properties.map((p) => p.name)).toEqual(["P2", "P1"]);
	});

	it("caps limit at MAX_LIMIT (50)", async () => {
		const docs = Array.from({ length: 55 }, (_, i) =>
			payload({ name: `Bulk${i}` }),
		);
		await Property.insertMany(docs);
		const res = await getPropertiesDB({ userId: USER, limit: 500 });
		expect(res.total).toBe(55);
		expect(res.properties).toHaveLength(50);
	});

	it("attaches occupied unit counts per property", async () => {
		const prop = await createPropertyDB({ payload: payload() });
		await Unit.create({
			name: "U1",
			rent: 100,
			propertyId: prop!.id,
			userId: USER,
			status: "Occupied",
		});
		await Unit.create({
			name: "U2",
			rent: 100,
			propertyId: prop!.id,
			userId: USER,
			status: "Occupied",
		});
		await Unit.create({
			name: "U3",
			rent: 100,
			propertyId: prop!.id,
			userId: USER,
			status: "Vacant",
		});
		// deleted units must not count
		await Unit.create({
			name: "U4",
			rent: 100,
			propertyId: prop!.id,
			userId: USER,
			status: "Occupied",
			deleted: true,
		});

		const { properties } = await getPropertiesDB({ userId: USER });
		expect(properties[0]?.occupied).toBe(2);
	});

	it("presigns property images through the post-aggregate hook", async () => {
		await createPropertyDB({
			payload: payload({ image: `img-${crypto.randomUUID()}.jpg` }),
		});
		const { properties } = await getPropertiesDB({ userId: USER });
		expect(properties[0]?.image).toBe("https://fake-s3.example/signed-url");
	});
});

describe("getPropertyByIdDB", () => {
	it("returns the property for its owner", async () => {
		const created = await createPropertyDB({ payload: payload() });
		const found = await getPropertyByIdDB({ id: created!.id, userId: USER });
		expect(found).not.toBeNull();
		expect(found?.id).toBe(created!.id);
		expect(found?.name).toBe("Sunset Villa");
	});

	it("returns null for another user's property", async () => {
		const created = await createPropertyDB({ payload: payload() });
		expect(
			await getPropertyByIdDB({ id: created!.id, userId: OTHER }),
		).toBeNull();
	});

	it("returns null for soft-deleted properties", async () => {
		const created = await createPropertyDB({ payload: payload() });
		await deletePropertyDB({ id: created!.id, userId: USER });
		expect(
			await getPropertyByIdDB({ id: created!.id, userId: USER }),
		).toBeNull();
	});

	it("returns null for a malformed id", async () => {
		expect(await getPropertyByIdDB({ id: "not-an-id", userId: USER })).toBeNull();
	});

	it("returns null for a valid but unknown id", async () => {
		expect(
			await getPropertyByIdDB({
				id: new mongoose.Types.ObjectId().toString(),
				userId: USER,
			}),
		).toBeNull();
	});
});

describe("updatePropertyDB", () => {
	it("updates fields and persists the change", async () => {
		const created = await createPropertyDB({ payload: payload() });
		const updated = await updatePropertyDB({
			id: created!.id,
			userId: USER,
			payload: { name: "Renamed", monthlyRent: 999 },
		});
		expect(updated?.name).toBe("Renamed");
		expect(updated?.monthlyRent).toBe(999);
		const inDb = await Property.findById(created!.id).lean();
		expect(inDb?.name).toBe("Renamed");
	});

	it("returns null for another user's property and leaves it untouched", async () => {
		const created = await createPropertyDB({ payload: payload() });
		const updated = await updatePropertyDB({
			id: created!.id,
			userId: OTHER,
			payload: { name: "Hacked" },
		});
		expect(updated).toBeNull();
		const inDb = await Property.findById(created!.id).lean();
		expect(inDb?.name).toBe("Sunset Villa");
	});

	it("returns null for a soft-deleted property", async () => {
		const created = await createPropertyDB({ payload: payload() });
		await deletePropertyDB({ id: created!.id, userId: USER });
		expect(
			await updatePropertyDB({
				id: created!.id,
				userId: USER,
				payload: { name: "Zombie" },
			}),
		).toBeNull();
	});

	it("presigns the image on the returned object", async () => {
		const created = await createPropertyDB({
			payload: payload({ image: `upd-${crypto.randomUUID()}.png` }),
		});
		const updated = await updatePropertyDB({
			id: created!.id,
			userId: USER,
			payload: { name: "WithImage" },
		});
		expect(updated?.image).toBe("https://fake-s3.example/signed-url");
	});
});

describe("deletePropertyDB", () => {
	it("soft-deletes: flag set in DB, doc still stored", async () => {
		const created = await createPropertyDB({ payload: payload() });
		const deleted = await deletePropertyDB({ id: created!.id, userId: USER });
		expect(deleted).not.toBeNull();
		const inDb = await Property.findById(created!.id).lean();
		expect(inDb?.deleted).toBe(true);
	});

	it("returns null when already deleted or wrong owner", async () => {
		const created = await createPropertyDB({ payload: payload() });
		expect(await deletePropertyDB({ id: created!.id, userId: OTHER })).toBeNull();
		await deletePropertyDB({ id: created!.id, userId: USER });
		expect(await deletePropertyDB({ id: created!.id, userId: USER })).toBeNull();
	});
});

describe("increment/decrement totalUnits", () => {
	it("increments totalUnits for the owner", async () => {
		const created = await createPropertyDB({ payload: payload({ totalUnits: 4 }) });
		await incrementPropertyTotalUnitsDB({ id: created!.id, userId: USER });
		const inDb = await Property.findById(created!.id).lean();
		expect(inDb?.totalUnits).toBe(5);
	});

	it("does nothing for the wrong owner", async () => {
		const created = await createPropertyDB({ payload: payload({ totalUnits: 4 }) });
		await incrementPropertyTotalUnitsDB({ id: created!.id, userId: OTHER });
		await decrementPropertyTotalUnitsDB({ id: created!.id, userId: OTHER });
		const inDb = await Property.findById(created!.id).lean();
		expect(inDb?.totalUnits).toBe(4);
	});

	it("decrements but never below zero", async () => {
		const created = await createPropertyDB({ payload: payload({ totalUnits: 1 }) });
		await decrementPropertyTotalUnitsDB({ id: created!.id, userId: USER });
		let inDb = await Property.findById(created!.id).lean();
		expect(inDb?.totalUnits).toBe(0);
		await decrementPropertyTotalUnitsDB({ id: created!.id, userId: USER });
		inDb = await Property.findById(created!.id).lean();
		expect(inDb?.totalUnits).toBe(0);
	});
});

describe("getPropertyStatsDB", () => {
	it("aggregates totals for the user, excluding deleted", async () => {
		await createPropertyDB({
			payload: payload({ totalUnits: 3, monthlyRent: 100 }),
		});
		await createPropertyDB({
			payload: payload({ totalUnits: 7, monthlyRent: 250 }),
		});
		const gone = await createPropertyDB({
			payload: payload({ totalUnits: 99, monthlyRent: 9999 }),
		});
		await deletePropertyDB({ id: gone!.id, userId: USER });
		await createPropertyDB({
			payload: payload({ userId: OTHER, totalUnits: 50, monthlyRent: 5000 }),
		});

		const stats = await getPropertyStatsDB({ userId: USER });
		expect(stats).toEqual({
			totalProperties: 2,
			totalUnits: 10,
			totalMonthlyRent: 350,
		});
	});

	it("returns zeros for an empty user", async () => {
		expect(await getPropertyStatsDB({ userId: "ghost" })).toEqual({
			totalProperties: 0,
			totalUnits: 0,
			totalMonthlyRent: 0,
		});
	});
});

describe("getPropertiesByIdsDB", () => {
	it("returns [] for an empty ids array", async () => {
		expect(await getPropertiesByIdsDB({ ids: [] })).toEqual([]);
	});

	it("returns matching properties, scoped to userId when given", async () => {
		const mine = await createPropertyDB({ payload: payload({ name: "Mine" }) });
		const theirs = await createPropertyDB({
			payload: payload({ name: "Theirs", userId: OTHER }),
		});

		const scoped = await getPropertiesByIdsDB({
			ids: [mine!.id, theirs!.id],
			userId: USER,
		});
		expect(scoped.map((p) => p.name)).toEqual(["Mine"]);

		const unscoped = await getPropertiesByIdsDB({
			ids: [mine!.id, theirs!.id],
		});
		expect(unscoped.map((p) => p.name).sort()).toEqual(["Mine", "Theirs"]);
	});

	it("excludes soft-deleted properties", async () => {
		const gone = await createPropertyDB({ payload: payload() });
		await deletePropertyDB({ id: gone!.id, userId: USER });
		expect(
			await getPropertiesByIdsDB({ ids: [gone!.id], userId: USER }),
		).toEqual([]);
	});

	it("returns [] when an id is malformed", async () => {
		expect(await getPropertiesByIdsDB({ ids: ["oops"], userId: USER })).toEqual(
			[],
		);
	});
});
