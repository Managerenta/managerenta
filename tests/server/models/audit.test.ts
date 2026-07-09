import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
	AuditEvent,
	createAuditEventDB,
	getAuditEventsDB,
} from "../../../src/server/models/audit";
import type { IAuditCreateInput } from "../../../src/server/models/audit/types";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const OWNER = "owner-audit-1";
const OTHER = "owner-audit-2";

function payload(overrides: Record<string, unknown> = {}): IAuditCreateInput {
	return {
		ownerId: OWNER,
		actorId: "actor-1",
		action: "create",
		entityType: "property",
		entityId: "prop-1",
		description: "Created a property",
		...overrides,
	} as IAuditCreateInput;
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

describe("createAuditEventDB", () => {
	it("appends an audit event with createdAt and metadata", async () => {
		const event = await createAuditEventDB({
			payload: payload({
				metadata: { before: null, after: { name: "X" } },
				ip: "1.2.3.4",
			}),
		});
		expect(event).not.toBeNull();
		expect(event?.id).toBeTruthy();
		expect(event?.createdAt).toBeInstanceOf(Date);

		const inDb = await AuditEvent.findById(event?.id).lean();
		expect(inDb?.action).toBe("create");
		expect(inDb?.metadata).toEqual({ before: null, after: { name: "X" } });
		expect(inDb?.ip).toBe("1.2.3.4");
		// append-only schema: no updatedAt
		expect(
			(inDb as never as { updatedAt?: Date })?.updatedAt,
		).toBeUndefined();
	});

	it("returns null when required fields are missing", async () => {
		expect(
			await createAuditEventDB({ payload: { ownerId: OWNER } as never }),
		).toBeNull();
		expect(await AuditEvent.countDocuments({})).toBe(0);
	});
});

describe("getAuditEventsDB", () => {
	it("returns only the owner's events, newest first, with string ids", async () => {
		await AuditEvent.create({
			...payload({ action: "old" }),
			createdAt: new Date("2024-01-01"),
		});
		await AuditEvent.create({
			...payload({ action: "new" }),
			createdAt: new Date("2024-06-01"),
		});
		await AuditEvent.create(payload({ ownerId: OTHER, action: "foreign" }));

		const { events, total } = await getAuditEventsDB({ ownerId: OWNER });
		expect(total).toBe(2);
		expect(events.map((e) => e.action)).toEqual(["new", "old"]);
		expect(typeof events[0]?.id).toBe("string");
		expect((events[0] as never as { __v?: number }).__v).toBeUndefined();
	});

	it("filters by entityType and action; 'all' disables the filter", async () => {
		await createAuditEventDB({
			payload: payload({ entityType: "property", action: "create" }),
		});
		await createAuditEventDB({
			payload: payload({ entityType: "tenant", action: "delete" }),
		});

		const byEntity = await getAuditEventsDB({
			ownerId: OWNER,
			entityType: "tenant",
		});
		expect(byEntity.total).toBe(1);
		expect(byEntity.events[0]?.entityType).toBe("tenant");

		const byAction = await getAuditEventsDB({
			ownerId: OWNER,
			action: "create",
		});
		expect(byAction.total).toBe(1);
		expect(byAction.events[0]?.action).toBe("create");

		const both = await getAuditEventsDB({
			ownerId: OWNER,
			entityType: "tenant",
			action: "create",
		});
		expect(both.total).toBe(0);

		const all = await getAuditEventsDB({
			ownerId: OWNER,
			entityType: "all",
			action: "all",
		});
		expect(all.total).toBe(2);
	});

	it("paginates with limit/offset and caps limit at MAX_LIMIT (50)", async () => {
		const docs = Array.from({ length: 55 }, (_, i) => ({
			...payload({ action: `a${i}` }),
			createdAt: new Date(2024, 0, 1, 0, i),
		}));
		await AuditEvent.insertMany(docs);

		const page = await getAuditEventsDB({
			ownerId: OWNER,
			limit: 2,
			offset: 1,
		});
		expect(page.total).toBe(55);
		expect(page.events.map((e) => e.action)).toEqual(["a53", "a52"]);

		const capped = await getAuditEventsDB({ ownerId: OWNER, limit: 9999 });
		expect(capped.events).toHaveLength(50);
	});

	it("returns empty for an unknown owner", async () => {
		await createAuditEventDB({ payload: payload() });
		expect(await getAuditEventsDB({ ownerId: "ghost" })).toEqual({
			events: [],
			total: 0,
		});
	});
});
