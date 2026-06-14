import { createAuditEventDB, getAuditEventsDB } from "../../models";
import type {
	IAuditAction,
	IAuditCreateInput,
	IAuditEntityType,
} from "../../models/audit/types";

/**
 * Record an audit event. Designed to be called fire-and-forget (`void
 * recordAuditEvent(...)`) from route handlers — it never throws, so a logging
 * failure can't break the user-facing action.
 */
export async function recordAuditEvent(
	input: IAuditCreateInput,
): Promise<void> {
	try {
		await createAuditEventDB({ payload: input });
	} catch {
		// auditing must never break the request
	}
}

export async function listAuditEvents({
	ownerId,
	limit,
	offset,
	entityType,
	action,
}: {
	ownerId: string;
	limit?: number;
	offset?: number;
	entityType?: string;
	action?: string;
}) {
	return getAuditEventsDB({ ownerId, limit, offset, entityType, action });
}

export type { IAuditAction, IAuditEntityType };
