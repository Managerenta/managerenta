import { getPlatformAuditEventsDB } from "../../models";

// Cross-owner audit feed for the operator console. Behind a platform-plane
// authorize(). Thin wrapper over the model query so callers stay decoupled.

export default async function listPlatformAudit({
	limit,
	offset,
	entityType,
	action,
	organizationId,
	ownerId,
}: {
	limit?: number;
	offset?: number;
	entityType?: string;
	action?: string;
	organizationId?: string;
	ownerId?: string;
}) {
	return getPlatformAuditEventsDB({
		limit,
		offset,
		entityType,
		action,
		organizationId,
		ownerId,
	});
}
