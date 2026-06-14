export type IAuditAction =
	| "create"
	| "update"
	| "delete"
	| "login"
	| "logout"
	| "invite"
	| "role-change"
	| "member-remove"
	| "export";

export type IAuditEntityType =
	| "property"
	| "unit"
	| "tenant"
	| "transaction"
	| "maintenance"
	| "vendor"
	| "document"
	| "organization"
	| "member"
	| "user"
	| "session";

export interface IAuditCreateInput {
	/** The owner scope the event belongs to (effective owner id). */
	ownerId: string;
	/** The user who performed the action. */
	actorId: string;
	organizationId?: string;
	action: IAuditAction;
	entityType: IAuditEntityType;
	entityId?: string;
	description?: string;
	metadata?: Record<string, unknown>;
	ip?: string;
}

export interface IAuditEvent extends IAuditCreateInput {
	id: string;
	createdAt: Date;
}
