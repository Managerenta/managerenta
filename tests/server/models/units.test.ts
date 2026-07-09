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

vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: vi.fn(async () => "https://fake-s3.example/signed-avatar"),
}));

import { disconnectRedis } from "../../../src/server/databases";
import { Property } from "../../../src/server/models/properties";
import {
	createUnitDB,
	deleteUnitDB,
	getUnitByIdDB,
	getUnitsByIdsDB,
	getUnitsByPropertyIdDB,
	getUnitStatsDB,
	getVacantUnitsDB,
	IUnitStatus,
	setUnitOccupiedDB,
	setUnitVacantDB,
	softDeleteUnitsByPropertyDB,
	Unit,
	updateUnitDB,
} from "../../../src/server/models/units";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const USER = "user-units-1";
const OTHER = "user-units-2";
const PROP = "prop-1";

function payload(overrides: Record<string, unknown> = {}) {
	return {
		name: "Unit 1A",
		rent: 800,
		propertyId: PROP,
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
afterEach(() => {
	vi.restoreAllMocks();
});
afterAll(async () => {
	await dropTestDB();
	await disconnectRedis().catch(() => {});
});

describe("createUnitDB", () => {
	it("creates a unit with Vacant default status", async () => {
		const unit = await createUnitDB({ payload: payload() });
		expect(unit).not.toBeNull();
		expect(unit?.status).toBe(IUnitStatus.Vacant);
		expect(unit?.tenant).toBeNull();

		const inDb = await Unit.findById(unit?.id).lean();
		expect(inDb?.name).toBe("Unit 1A");
		expect(inDb?.deleted).toBe(false);
	});

	it("returns null when required fields are missing", async () => {
		const unit = await createUnitDB({
			payload: {
				name: "No rent",
				propertyId: PROP,
				userId: USER,
			} as never,
		});
		expect(unit).toBeNull();
		expect(await Unit.countDocuments({})).toBe(0);
	});
});

describe("getUnitsByPropertyIdDB", () => {
	it("returns units for the property scoped by user, sorted by createdAt asc", async () => {
		await Unit.create({
			...payload({ name: "B" }),
			createdAt: new Date("2024-02-01"),
		});
		await Unit.create({
			...payload({ name: "A" }),
			createdAt: new Date("2024-01-01"),
		});
		await Unit.create(payload({ name: "OtherProp", propertyId: "prop-x" }));
		await Unit.create(payload({ name: "OtherUser", userId: OTHER }));
		await Unit.create({ ...payload({ name: "Deleted" }), deleted: true });

		const units = await getUnitsByPropertyIdDB({
			propertyId: PROP,
			userId: USER,
		});
		expect(units.map((u) => u.name)).toEqual(["A", "B"]);
	});

	it("returns [] when the property has no units for that user", async () => {
		await Unit.create(payload());
		expect(
			await getUnitsByPropertyIdDB({ propertyId: PROP, userId: OTHER }),
		).toEqual([]);
	});

	it("resolves tenant subdocument with a presigned avatar", async () => {
		const tenantId = new mongoose.Types.ObjectId().toString();
		await Unit.create(
			payload({
				status: "Occupied",
				tenant: {
					tenantId,
					name: "Jane Doe",
					avatar: `avatar-${crypto.randomUUID()}.png`,
				},
			}),
		);
		const units = await getUnitsByPropertyIdDB({
			propertyId: PROP,
			userId: USER,
		});
		expect(units[0]?.tenant).toEqual({
			_id: tenantId,
			name: "Jane Doe",
			avatar: "https://fake-s3.example/signed-avatar",
		});
	});

	it("resolves a null avatar when none is stored, and returns a stub tenant for vacant units", async () => {
		const tenantId = new mongoose.Types.ObjectId().toString();
		await Unit.create({
			...payload({ name: "Vacant1" }),
			createdAt: new Date("2024-01-01"),
		});
		await Unit.create({
			...payload({
				name: "NoAvatar",
				status: "Occupied",
				tenant: { tenantId, name: "Bob" },
			}),
			createdAt: new Date("2024-02-01"),
		});
		const units = await getUnitsByPropertyIdDB({
			propertyId: PROP,
			userId: USER,
		});
		// Quirk of the current pipeline: the `$addFields: {"tenant.avatar": ...}`
		// stage materializes a tenant object even when tenant is null, so vacant
		// units surface a stub tenant instead of null here (unlike getUnitByIdDB
		// and getVacantUnitsDB, which do return null).
		expect(units[0]?.tenant).toEqual({
			_id: undefined,
			name: undefined,
			avatar: null,
		});
		expect(units[1]?.tenant).toEqual({
			_id: tenantId,
			name: "Bob",
			avatar: null,
		});
	});
});

describe("getUnitStatsDB", () => {
	it("counts occupied and vacant units, excluding deleted and other users", async () => {
		const tenant = {
			tenantId: new mongoose.Types.ObjectId().toString(),
			name: "T",
		};
		await Unit.create(payload({ status: "Occupied", tenant }));
		await Unit.create(payload({ name: "U2", status: "Occupied", tenant }));
		await Unit.create(payload({ name: "U3" })); // Vacant default
		await Unit.create({
			...payload({ name: "U4", status: "Occupied", tenant }),
			deleted: true,
		});
		await Unit.create(payload({ name: "U5", userId: OTHER }));

		expect(await getUnitStatsDB({ userId: USER })).toEqual({
			occupiedUnits: 2,
			vacantUnits: 1,
		});
	});

	it("returns zeros for an unknown user", async () => {
		expect(await getUnitStatsDB({ userId: "ghost" })).toEqual({
			occupiedUnits: 0,
			vacantUnits: 0,
		});
	});
});

describe("setUnitOccupiedDB / setUnitVacantDB", () => {
	it("marks a unit occupied with the tenant, then vacant clearing it", async () => {
		const unit = await createUnitDB({ payload: payload() });
		const tenant = {
			tenantId: new mongoose.Types.ObjectId().toString(),
			name: "Renter",
		};
		await setUnitOccupiedDB({ id: unit!.id, tenant });
		let inDb = await Unit.findById(unit!.id).lean();
		expect(inDb?.status).toBe("Occupied");
		expect(inDb?.tenant?.name).toBe("Renter");
		expect(inDb?.tenant?.tenantId).toBe(tenant.tenantId);

		await setUnitVacantDB({ id: unit!.id });
		inDb = await Unit.findById(unit!.id).lean();
		expect(inDb?.status).toBe("Vacant");
		expect(inDb?.tenant).toBeNull();
	});
});

describe("getVacantUnitsDB", () => {
	it("returns vacant units by default with the property populated", async () => {
		const prop = await Property.create({
			name: "Main Property",
			address: "1 Way",
			type: "House",
			totalUnits: 2,
			userId: USER,
		});
		await Unit.create(payload({ name: "V1", propertyId: prop.id }));
		await Unit.create(
			payload({
				name: "O1",
				propertyId: prop.id,
				status: "Occupied",
				tenant: {
					tenantId: new mongoose.Types.ObjectId().toString(),
					name: "T",
				},
			}),
		);

		const vacant = await getVacantUnitsDB({ userId: USER });
		expect(vacant).toHaveLength(1);
		expect(vacant[0]?.name).toBe("V1");
		expect(vacant[0]?.property).toEqual({
			_id: prop.id,
			name: "Main Property",
		});
		expect(vacant[0]?.tenant).toBeNull();
	});

	it("supports status=Occupied and null property when lookup misses", async () => {
		await Unit.create(
			payload({
				name: "O1",
				propertyId: new mongoose.Types.ObjectId().toString(),
				status: "Occupied",
				tenant: {
					tenantId: new mongoose.Types.ObjectId().toString(),
					name: "T",
				},
			}),
		);
		const occupied = await getVacantUnitsDB({
			userId: USER,
			status: "Occupied",
		});
		expect(occupied).toHaveLength(1);
		expect(occupied[0]?.name).toBe("O1");
		expect(occupied[0]?.property).toBeNull();
	});

	it("scopes by user and applies the limit", async () => {
		for (let i = 0; i < 3; i++)
			await Unit.create(payload({ name: `V${i}` }));
		await Unit.create(payload({ name: "VX", userId: OTHER }));

		const limited = await getVacantUnitsDB({ userId: USER, limit: 2 });
		expect(limited).toHaveLength(2);

		const all = await getVacantUnitsDB({ userId: USER });
		expect(all).toHaveLength(3);
		expect(all.every((u) => u.userId === USER)).toBe(true);
	});

	it("returns [] when nothing matches", async () => {
		expect(await getVacantUnitsDB({ userId: "ghost" })).toEqual([]);
	});
});

describe("getUnitByIdDB", () => {
	it("returns the unit for its owner with resolved tenant", async () => {
		const unit = await createUnitDB({ payload: payload() });
		const found = await getUnitByIdDB({ id: unit!.id, userId: USER });
		expect(found?.id).toBe(unit!.id);
		expect(found?.tenant).toBeNull();
	});

	it("returns null for wrong owner, deleted unit, or malformed id", async () => {
		const unit = await createUnitDB({ payload: payload() });
		expect(await getUnitByIdDB({ id: unit!.id, userId: OTHER })).toBeNull();

		await deleteUnitDB({ id: unit!.id, userId: USER });
		expect(await getUnitByIdDB({ id: unit!.id, userId: USER })).toBeNull();

		expect(await getUnitByIdDB({ id: "garbage", userId: USER })).toBeNull();
	});
});

describe("updateUnitDB", () => {
	it("updates name/rent and persists", async () => {
		const unit = await createUnitDB({ payload: payload() });
		const updated = await updateUnitDB({
			id: unit!.id,
			userId: USER,
			payload: { name: "Unit 9Z", rent: 1234 },
		});
		expect(updated?.name).toBe("Unit 9Z");
		expect(updated?.rent).toBe(1234);
		const inDb = await Unit.findById(unit!.id).lean();
		expect(inDb?.rent).toBe(1234);
	});

	it("returns null for wrong owner or deleted unit", async () => {
		const unit = await createUnitDB({ payload: payload() });
		expect(
			await updateUnitDB({
				id: unit!.id,
				userId: OTHER,
				payload: { rent: 1 },
			}),
		).toBeNull();
		await deleteUnitDB({ id: unit!.id, userId: USER });
		expect(
			await updateUnitDB({
				id: unit!.id,
				userId: USER,
				payload: { rent: 1 },
			}),
		).toBeNull();
		const inDb = await Unit.findById(unit!.id).lean();
		expect(inDb?.rent).toBe(800);
	});

	it("returns null when the update query throws (catch path)", async () => {
		const unit = await createUnitDB({ payload: payload() });
		vi.spyOn(Unit, "findOneAndUpdate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(
			await updateUnitDB({
				id: unit!.id,
				userId: USER,
				payload: { rent: 5 },
			}),
		).toBeNull();
	});
});

describe("deleteUnitDB", () => {
	it("soft-deletes and returns the doc; repeat delete returns null", async () => {
		const unit = await createUnitDB({ payload: payload() });
		const deleted = await deleteUnitDB({ id: unit!.id, userId: USER });
		expect(deleted?.deleted).toBe(true);
		const inDb = await Unit.findById(unit!.id).lean();
		expect(inDb?.deleted).toBe(true);
		expect(await deleteUnitDB({ id: unit!.id, userId: USER })).toBeNull();
	});

	it("returns null for the wrong owner", async () => {
		const unit = await createUnitDB({ payload: payload() });
		expect(await deleteUnitDB({ id: unit!.id, userId: OTHER })).toBeNull();
		const inDb = await Unit.findById(unit!.id).lean();
		expect(inDb?.deleted).toBe(false);
	});

	it("returns null when the delete query throws (catch path)", async () => {
		const unit = await createUnitDB({ payload: payload() });
		vi.spyOn(Unit, "findOneAndUpdate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(await deleteUnitDB({ id: unit!.id, userId: USER })).toBeNull();
		const inDb = await Unit.findById(unit!.id).lean();
		expect(inDb?.deleted).toBe(false);
	});
});

describe("softDeleteUnitsByPropertyDB", () => {
	it("soft-deletes all the user's units in a property and returns the count", async () => {
		await Unit.create(payload({ name: "U1" }));
		await Unit.create(payload({ name: "U2" }));
		await Unit.create(payload({ name: "OtherProp", propertyId: "prop-x" }));
		await Unit.create(payload({ name: "OtherUser", userId: OTHER }));

		const count = await softDeleteUnitsByPropertyDB({
			propertyId: PROP,
			userId: USER,
		});
		expect(count).toBe(2);
		expect(
			await Unit.countDocuments({
				propertyId: PROP,
				userId: USER,
				deleted: true,
			}),
		).toBe(2);
		expect(await Unit.countDocuments({ deleted: false })).toBe(2);
	});

	it("returns 0 when nothing matches", async () => {
		expect(
			await softDeleteUnitsByPropertyDB({
				propertyId: "none",
				userId: USER,
			}),
		).toBe(0);
	});
});

describe("getUnitsByIdsDB", () => {
	it("returns [] for empty ids and [] for malformed ids", async () => {
		expect(await getUnitsByIdsDB({ ids: [] })).toEqual([]);
		expect(await getUnitsByIdsDB({ ids: ["bad-id"] })).toEqual([]);
	});

	it("scopes to userId when provided and excludes deleted", async () => {
		const mine = await createUnitDB({ payload: payload({ name: "Mine" }) });
		const theirs = await createUnitDB({
			payload: payload({ name: "Theirs", userId: OTHER }),
		});
		const gone = await createUnitDB({ payload: payload({ name: "Gone" }) });
		await deleteUnitDB({ id: gone!.id, userId: USER });

		const scoped = await getUnitsByIdsDB({
			ids: [mine!.id, theirs!.id, gone!.id],
			userId: USER,
		});
		expect(scoped.map((u) => u.name)).toEqual(["Mine"]);

		const unscoped = await getUnitsByIdsDB({ ids: [mine!.id, theirs!.id] });
		expect(unscoped.map((u) => u.name).sort()).toEqual(["Mine", "Theirs"]);
	});
});
