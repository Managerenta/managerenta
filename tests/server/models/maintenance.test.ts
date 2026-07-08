import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: vi.fn(async () => "https://fake-s3.example/signed-image"),
}));

import { disconnectRedis } from "../../../src/server/databases";
import {
	createMaintenanceRequestDB,
	deleteMaintenanceRequestDB,
	getMaintenanceRequestByIdDB,
	getMaintenanceRequestsDB,
	getMaintenanceStatsDB,
	MaintenanceRequest,
	updateMaintenanceRequestDB,
} from "../../../src/server/models/maintenance";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const USER = "user-maint-1";
const OTHER = "user-maint-2";

function payload(overrides: Record<string, unknown> = {}) {
	return {
		userId: USER,
		propertyId: "prop-1",
		title: "Leaky faucet",
		description: "Kitchen faucet drips",
		category: "plumbing" as const,
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

describe("createMaintenanceRequestDB", () => {
	it("creates a request with defaults (medium priority, open status)", async () => {
		const req = await createMaintenanceRequestDB({ payload: payload() });
		expect(req).not.toBeNull();
		expect(req?.priority).toBe("medium");
		expect(req?.status).toBe("open");
		expect(req?.images).toEqual([]);

		const inDb = await MaintenanceRequest.findById(req?.id).lean();
		expect(inDb?.title).toBe("Leaky faucet");
		expect(inDb?.deleted).toBe(false);
	});

	it("returns null on invalid category enum", async () => {
		const req = await createMaintenanceRequestDB({
			payload: payload({ category: "witchcraft" }) as never,
		});
		expect(req).toBeNull();
		expect(await MaintenanceRequest.countDocuments({})).toBe(0);
	});
});

describe("getMaintenanceRequestsDB", () => {
	it("lists only the user's non-deleted requests, newest first", async () => {
		await MaintenanceRequest.create({
			...payload({ title: "Old" }),
			createdAt: new Date("2024-01-01"),
		});
		await MaintenanceRequest.create({
			...payload({ title: "New" }),
			createdAt: new Date("2024-06-01"),
		});
		await MaintenanceRequest.create({ ...payload({ title: "Del" }), deleted: true });
		await MaintenanceRequest.create(payload({ title: "Foreign", userId: OTHER }));

		const { requests, total } = await getMaintenanceRequestsDB({ userId: USER });
		expect(total).toBe(2);
		expect(requests.map((r) => r.title)).toEqual(["New", "Old"]);
		expect(typeof requests[0]?.id).toBe("string");
	});

	it("filters by status, priority, propertyId, and treats 'all' as no filter", async () => {
		await MaintenanceRequest.create(
			payload({ title: "A", status: "open", priority: "low", propertyId: "p1" }),
		);
		await MaintenanceRequest.create(
			payload({
				title: "B",
				status: "completed",
				priority: "urgent",
				propertyId: "p2",
			}),
		);

		const byStatus = await getMaintenanceRequestsDB({ userId: USER, status: "completed" });
		expect(byStatus.requests.map((r) => r.title)).toEqual(["B"]);

		const byPriority = await getMaintenanceRequestsDB({ userId: USER, priority: "low" });
		expect(byPriority.requests.map((r) => r.title)).toEqual(["A"]);

		const byProperty = await getMaintenanceRequestsDB({ userId: USER, propertyId: "p2" });
		expect(byProperty.requests.map((r) => r.title)).toEqual(["B"]);

		const allStatus = await getMaintenanceRequestsDB({
			userId: USER,
			status: "all",
			priority: "all",
		});
		expect(allStatus.total).toBe(2);
	});

	it("searches title and description case-insensitively", async () => {
		await MaintenanceRequest.create(payload({ title: "Broken heater" }));
		await MaintenanceRequest.create(
			payload({ title: "Other", description: "The HEATER hums" }),
		);
		await MaintenanceRequest.create(payload({ title: "Unrelated" }));

		const res = await getMaintenanceRequestsDB({ userId: USER, search: "heater" });
		expect(res.total).toBe(2);
	});

	it("treats regex metacharacters literally and does not throw", async () => {
		await MaintenanceRequest.create(payload({ title: "Fix pipe (unit 2)" }));
		await MaintenanceRequest.create(payload({ title: "Fix pipe unit 2" }));

		const literal = await getMaintenanceRequestsDB({
			userId: USER,
			search: "(unit 2)",
		});
		expect(literal.total).toBe(1);
		expect(literal.requests[0]?.title).toBe("Fix pipe (unit 2)");

		const wild = await getMaintenanceRequestsDB({ userId: USER, search: "$^|.*+?" });
		expect(wild.total).toBe(0);
	});

	it("paginates with limit/offset and caps limit at MAX_LIMIT (50)", async () => {
		const docs = Array.from({ length: 55 }, (_, i) => ({
			...payload({ title: `T${i}` }),
			createdAt: new Date(2024, 0, 1, 0, i),
		}));
		await MaintenanceRequest.insertMany(docs);

		const page = await getMaintenanceRequestsDB({ userId: USER, limit: 2, offset: 1 });
		expect(page.total).toBe(55);
		expect(page.requests.map((r) => r.title)).toEqual(["T53", "T52"]);

		const capped = await getMaintenanceRequestsDB({ userId: USER, limit: 999 });
		expect(capped.requests).toHaveLength(50);
	});

	it("presigns image keys through the post-aggregate hook", async () => {
		await createMaintenanceRequestDB({
			payload: payload({
				images: [`maint-${crypto.randomUUID()}.jpg`, `maint-${crypto.randomUUID()}.png`],
			}) as never,
		});
		const { requests } = await getMaintenanceRequestsDB({ userId: USER });
		expect(requests[0]?.images).toEqual([
			"https://fake-s3.example/signed-image",
			"https://fake-s3.example/signed-image",
		]);
	});
});

describe("getMaintenanceRequestByIdDB", () => {
	it("returns the request for its owner", async () => {
		const req = await createMaintenanceRequestDB({ payload: payload() });
		const found = await getMaintenanceRequestByIdDB({ id: req!.id, userId: USER });
		expect(found?.id).toBe(req!.id);
		expect(found?.title).toBe("Leaky faucet");
	});

	it("returns null for wrong owner, deleted request, or malformed id", async () => {
		const req = await createMaintenanceRequestDB({ payload: payload() });
		expect(
			await getMaintenanceRequestByIdDB({ id: req!.id, userId: OTHER }),
		).toBeNull();

		await deleteMaintenanceRequestDB({ id: req!.id, userId: USER });
		expect(
			await getMaintenanceRequestByIdDB({ id: req!.id, userId: USER }),
		).toBeNull();

		expect(
			await getMaintenanceRequestByIdDB({ id: "zzz", userId: USER }),
		).toBeNull();
	});
});

describe("updateMaintenanceRequestDB", () => {
	it("updates fields and persists", async () => {
		const req = await createMaintenanceRequestDB({ payload: payload() });
		const updated = await updateMaintenanceRequestDB({
			id: req!.id,
			userId: USER,
			payload: { status: "in-progress", cost: 150 } as never,
		});
		expect(updated?.status).toBe("in-progress");
		expect(updated?.cost).toBe(150);
		const inDb = await MaintenanceRequest.findById(req!.id).lean();
		expect(inDb?.status).toBe("in-progress");
	});

	it("returns null for wrong owner or unknown id", async () => {
		const req = await createMaintenanceRequestDB({ payload: payload() });
		expect(
			await updateMaintenanceRequestDB({
				id: req!.id,
				userId: OTHER,
				payload: { title: "X" },
			}),
		).toBeNull();
		expect(
			await updateMaintenanceRequestDB({
				id: new mongoose.Types.ObjectId().toString(),
				userId: USER,
				payload: { title: "X" },
			}),
		).toBeNull();
	});
});

describe("deleteMaintenanceRequestDB", () => {
	it("soft-deletes and returns true; repeat delete returns false", async () => {
		const req = await createMaintenanceRequestDB({ payload: payload() });
		expect(await deleteMaintenanceRequestDB({ id: req!.id, userId: USER })).toBe(true);
		const inDb = await MaintenanceRequest.findById(req!.id).lean();
		expect(inDb?.deleted).toBe(true);
		expect(await deleteMaintenanceRequestDB({ id: req!.id, userId: USER })).toBe(false);
	});

	it("returns false for wrong owner or malformed id", async () => {
		const req = await createMaintenanceRequestDB({ payload: payload() });
		expect(await deleteMaintenanceRequestDB({ id: req!.id, userId: OTHER })).toBe(false);
		expect(await deleteMaintenanceRequestDB({ id: "nope", userId: USER })).toBe(false);
	});
});

describe("getMaintenanceStatsDB", () => {
	it("counts requests per status for the user", async () => {
		await MaintenanceRequest.create(payload({ status: "open" }));
		await MaintenanceRequest.create(payload({ title: "2", status: "open" }));
		await MaintenanceRequest.create(payload({ title: "3", status: "in-progress" }));
		await MaintenanceRequest.create(payload({ title: "4", status: "completed" }));
		await MaintenanceRequest.create(payload({ title: "5", status: "cancelled" }));
		// excluded: deleted + other user
		await MaintenanceRequest.create({
			...payload({ title: "6", status: "open" }),
			deleted: true,
		});
		await MaintenanceRequest.create(payload({ title: "7", userId: OTHER }));

		const stats = await getMaintenanceStatsDB({ userId: USER });
		expect(stats).toEqual({ open: 2, inProgress: 1, completed: 1, total: 5 });
	});

	it("returns zeros for an unknown user", async () => {
		expect(await getMaintenanceStatsDB({ userId: "ghost" })).toEqual({
			open: 0,
			inProgress: 0,
			completed: 0,
			total: 0,
		});
	});
});
