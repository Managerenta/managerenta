// Frontend-facing types for the maintenance / vendors / documents / audit
// modules. These mirror the server models but live here so client code never
// imports from `@/server` (which is server-only).

export type IMaintenanceCategory =
	| "plumbing"
	| "electrical"
	| "hvac"
	| "appliance"
	| "structural"
	| "pest"
	| "cleaning"
	| "other";

export type IMaintenancePriority = "low" | "medium" | "high" | "urgent";

export type IMaintenanceStatus =
	| "open"
	| "in-progress"
	| "on-hold"
	| "completed"
	| "cancelled";

export interface IMaintenanceRequest {
	id: string;
	propertyId: string;
	unitId?: string;
	tenantId?: string;
	vendorId?: string;
	title: string;
	description: string;
	category: IMaintenanceCategory;
	priority: IMaintenancePriority;
	status: IMaintenanceStatus;
	cost?: number;
	scheduledDate?: string;
	completedDate?: string;
	images?: string[];
	createdAt: string;
	updatedAt: string;
}

export interface IMaintenanceStats {
	open: number;
	inProgress: number;
	completed: number;
	total: number;
}

export type IVendorSpecialty =
	| "plumbing"
	| "electrical"
	| "hvac"
	| "appliance"
	| "structural"
	| "pest"
	| "cleaning"
	| "general"
	| "other";

export interface IVendor {
	id: string;
	name: string;
	company?: string;
	specialty: IVendorSpecialty;
	phone?: string;
	email?: string;
	address?: string;
	notes?: string;
	rating?: number;
	createdAt: string;
	updatedAt: string;
}

export type IDocumentCategory =
	| "lease"
	| "id"
	| "receipt"
	| "invoice"
	| "insurance"
	| "inspection"
	| "contract"
	| "other";

export interface IDocumentItem {
	id: string;
	name: string;
	category: IDocumentCategory;
	propertyId?: string;
	unitId?: string;
	tenantId?: string;
	fileName: string;
	mimeType: string;
	size: number;
	url?: string;
	createdAt: string;
	updatedAt: string;
}

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

export interface IAuditEvent {
	id: string;
	actorId: string;
	organizationId?: string;
	action: IAuditAction;
	entityType: IAuditEntityType;
	entityId?: string;
	description?: string;
	metadata?: Record<string, unknown>;
	ip?: string;
	createdAt: string;
}
