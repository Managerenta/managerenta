import mongoose, { type ClientSession } from "mongoose";
import { MAX_LIMIT } from "../../constants";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../utils";
import type { IAuditCreateInput, IAuditEvent } from "./types";

const collectionName = "auditevents";

/**
 * Append-only audit trail. Records are never updated or deleted; they exist for
 * compliance and security forensics. A 1-year TTL keeps the collection bounded.
 */
const schema = new mongoose.Schema<IAuditEvent>(
	{
		ownerId: { type: String, required: true },
		actorId: { type: String, required: true },
		organizationId: { type: String, required: false },
		action: { type: String, required: true },
		entityType: { type: String, required: true },
		entityId: { type: String, required: false },
		description: { type: String, required: false },
		metadata: { type: mongoose.Schema.Types.Mixed, required: false },
		ip: { type: String, required: false },
	},
	{ timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ ownerId: 1, createdAt: -1 });
schema.index({ ownerId: 1, entityType: 1, createdAt: -1 });
// Retain audit events for 365 days.
schema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

schema.pre("aggregate", function () {
	this.pipeline().push({ $addFields: { id: { $toString: "$_id" } } });
	this.pipeline().push({ $project: { __v: 0 } });
});

export const AuditEvent: mongoose.Model<IAuditEvent> =
	(mongoose.models[collectionName] as
		| mongoose.Model<IAuditEvent>
		| undefined) ?? mongoose.model<IAuditEvent>(collectionName, schema);

export async function createAuditEventDB({
	payload,
	session,
}: {
	payload: IAuditCreateInput;
	session?: ClientSession;
}): Promise<IAuditEvent | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const doc = new AuditEvent(payload);
		const result = await doc.save({ session });
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createAuditEventDB",
			success: "true",
		});
		return { ...result.toObject(), id: result.id };
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createAuditEventDB",
			success: "false",
		});
		return null;
	}
}

export async function getAuditEventsDB({
	ownerId,
	limit = 50,
	offset = 0,
	entityType,
	action,
	session,
}: {
	ownerId: string;
	limit?: number;
	offset?: number;
	entityType?: string;
	action?: string;
	session?: ClientSession;
}): Promise<{ events: IAuditEvent[]; total: number }> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const match: Record<string, unknown> = { ownerId };
		if (entityType && entityType !== "all") match.entityType = entityType;
		if (action && action !== "all") match.action = action;

		const safeLimit = Math.min(limit, MAX_LIMIT);
		const [eventsResult, countResult] = await Promise.allSettled([
			AuditEvent.aggregate<IAuditEvent>(
				[
					{ $match: match },
					{ $sort: { createdAt: -1 } },
					{ $skip: offset },
					{ $limit: safeLimit },
				],
				{ session },
			),
			AuditEvent.aggregate<{ total: number }>(
				[{ $match: match }, { $count: "total" }],
				{ session },
			),
		]);

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getAuditEventsDB",
			success: "true",
		});

		const events =
			eventsResult.status === "fulfilled" ? eventsResult.value : [];
		const total =
			countResult.status === "fulfilled"
				? (countResult.value[0]?.total ?? 0)
				: 0;
		return { events, total };
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getAuditEventsDB",
			success: "false",
		});
		return { events: [], total: 0 };
	}
}

/**
 * Cross-owner audit query for the platform operator console. Unlike
 * {@link getAuditEventsDB} it does NOT scope to a single `ownerId`, so it must
 * only ever be reached behind a platform-plane `authorize()` (active operator).
 * Optional filters narrow by owner, organization, entity type or action.
 */
export async function getPlatformAuditEventsDB({
	limit = 50,
	offset = 0,
	entityType,
	action,
	organizationId,
	ownerId,
	session,
}: {
	limit?: number;
	offset?: number;
	entityType?: string;
	action?: string;
	organizationId?: string;
	ownerId?: string;
	session?: ClientSession;
}): Promise<{ events: IAuditEvent[]; total: number }> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const match: Record<string, unknown> = {};
		if (entityType && entityType !== "all") match.entityType = entityType;
		if (action && action !== "all") match.action = action;
		if (organizationId) match.organizationId = organizationId;
		if (ownerId) match.ownerId = ownerId;

		const safeLimit = Math.min(limit, MAX_LIMIT);
		const [eventsResult, countResult] = await Promise.allSettled([
			AuditEvent.aggregate<IAuditEvent>(
				[
					{ $match: match },
					{ $sort: { createdAt: -1 } },
					{ $skip: offset },
					{ $limit: safeLimit },
				],
				{ session },
			),
			AuditEvent.aggregate<{ total: number }>(
				[{ $match: match }, { $count: "total" }],
				{ session },
			),
		]);

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getPlatformAuditEventsDB",
			success: "true",
		});

		const events =
			eventsResult.status === "fulfilled" ? eventsResult.value : [];
		const total =
			countResult.status === "fulfilled"
				? (countResult.value[0]?.total ?? 0)
				: 0;
		return { events, total };
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getPlatformAuditEventsDB",
			success: "false",
		});
		return { events: [], total: 0 };
	}
}

export * from "./types";
