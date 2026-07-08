import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AuditEvent } from "../../../src/server/models/audit";
import {
	listAuditEvents,
	recordAuditEvent,
} from "../../../src/server/services/audit";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import { newId } from "../../helpers/seed";

describe("audit service", () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	beforeEach(async () => {
		await clearTestDB();
	});

	afterAll(async () => {
		await clearTestDB();
	});

	it("records an audit event with actor, entity and metadata", async () => {
		const ownerId = newId();
		const actorId = newId();
		const entityId = newId();

		await recordAuditEvent({
			ownerId,
			actorId,
			action: "create",
			entityType: "property",
			entityId,
			description: "Created property",
			metadata: { name: "Sunset Villas" },
			ip: "203.0.113.7",
		});

		const doc = await AuditEvent.findOne({ ownerId }).lean();
		expect(doc).toMatchObject({
			ownerId,
			actorId,
			action: "create",
			entityType: "property",
			entityId,
			description: "Created property",
			metadata: { name: "Sunset Villas" },
			ip: "203.0.113.7",
		});
		expect(doc?.createdAt).toBeInstanceOf(Date);
	});

	it("never throws, even for an invalid payload (fire-and-forget safety)", async () => {
		await expect(
			recordAuditEvent({
				// action/entityType missing → schema validation fails, but
				// the service must swallow it.
				ownerId: newId(),
			} as never),
		).resolves.toBeUndefined();
		expect(await AuditEvent.countDocuments({})).toBe(0);
	});

	describe("listAuditEvents", () => {
		async function seedEvents(ownerId: string) {
			const rows: Array<[string, string]> = [
				["create", "property"],
				["update", "property"],
				["delete", "unit"],
				["create", "tenant"],
			];
			for (const [action, entityType] of rows) {
				await recordAuditEvent({
					ownerId,
					actorId: ownerId,
					action: action as never,
					entityType: entityType as never,
				});
			}
		}

		it("filters by entityType and action, scoped to the owner", async () => {
			const ownerId = newId();
			await seedEvents(ownerId);
			await seedEvents(newId()); // another owner's noise

			const all = await listAuditEvents({ ownerId });
			expect(all.total).toBe(4);
			expect(all.events).toHaveLength(4);

			const properties = await listAuditEvents({
				ownerId,
				entityType: "property",
			});
			expect(properties.total).toBe(2);
			expect(
				properties.events.every((e) => e.entityType === "property"),
			).toBe(true);

			const creates = await listAuditEvents({
				ownerId,
				action: "create",
			});
			expect(creates.total).toBe(2);

			const createdProperties = await listAuditEvents({
				ownerId,
				entityType: "property",
				action: "create",
			});
			expect(createdProperties.total).toBe(1);

			// "all" sentinel disables the filter.
			const sentinel = await listAuditEvents({
				ownerId,
				entityType: "all",
				action: "all",
			});
			expect(sentinel.total).toBe(4);
		});

		it("paginates with limit/offset", async () => {
			const ownerId = newId();
			await seedEvents(ownerId);

			const page1 = await listAuditEvents({
				ownerId,
				limit: 3,
				offset: 0,
			});
			expect(page1.events).toHaveLength(3);
			expect(page1.total).toBe(4);

			const page2 = await listAuditEvents({
				ownerId,
				limit: 3,
				offset: 3,
			});
			expect(page2.events).toHaveLength(1);
		});

		it("returns empty results for an owner with no events", async () => {
			const result = await listAuditEvents({ ownerId: newId() });
			expect(result).toEqual({ events: [], total: 0 });
		});
	});
});
