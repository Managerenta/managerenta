import type { ISelectOption } from "@/components";

const titleCase = (s: string) =>
	s
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");

const toOptions = (values: string[]): ISelectOption[] =>
	values.map((v) => ({ label: titleCase(v), value: v }));

export const MAINTENANCE_CATEGORIES = [
	"plumbing",
	"electrical",
	"hvac",
	"appliance",
	"structural",
	"pest",
	"cleaning",
	"other",
];
export const MAINTENANCE_PRIORITIES = ["low", "medium", "high", "urgent"];
export const MAINTENANCE_STATUSES = [
	"open",
	"in-progress",
	"on-hold",
	"completed",
	"cancelled",
];
export const VENDOR_SPECIALTIES = [
	"plumbing",
	"electrical",
	"hvac",
	"appliance",
	"structural",
	"pest",
	"cleaning",
	"general",
	"other",
];
export const DOCUMENT_CATEGORIES = [
	"lease",
	"id",
	"receipt",
	"invoice",
	"insurance",
	"inspection",
	"contract",
	"other",
];
export const AUDIT_ACTIONS = [
	"create",
	"update",
	"delete",
	"login",
	"logout",
	"invite",
	"role-change",
	"member-remove",
	"export",
];
export const AUDIT_ENTITY_TYPES = [
	"property",
	"unit",
	"tenant",
	"transaction",
	"maintenance",
	"vendor",
	"document",
	"organization",
	"member",
	"user",
	"session",
];

const withAll = (opts: ISelectOption[]): ISelectOption[] => [
	{ label: "All", value: "all" },
	...opts,
];

export const categoryOptions = toOptions(MAINTENANCE_CATEGORIES);
export const priorityOptions = toOptions(MAINTENANCE_PRIORITIES);
export const statusOptions = toOptions(MAINTENANCE_STATUSES);
export const specialtyOptions = toOptions(VENDOR_SPECIALTIES);
export const documentCategoryOptions = toOptions(DOCUMENT_CATEGORIES);
export const auditActionOptions = toOptions(AUDIT_ACTIONS);
export const auditEntityOptions = toOptions(AUDIT_ENTITY_TYPES);

export const statusFilterOptions = withAll(statusOptions);
export const priorityFilterOptions = withAll(priorityOptions);
export const specialtyFilterOptions = withAll(specialtyOptions);
export const documentCategoryFilterOptions = withAll(documentCategoryOptions);
export const auditActionFilterOptions = withAll(auditActionOptions);
export const auditEntityFilterOptions = withAll(auditEntityOptions);

export { titleCase };

/** Soft background / foreground pairs for status & priority badges. */
export const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
	open: { bg: "#E0ECFB", fg: "#1D4E89" },
	"in-progress": { bg: "#FBEDE5", fg: "#B45309" },
	"on-hold": { bg: "#EFEAE2", fg: "#5B6573" },
	completed: { bg: "#DCFCE7", fg: "#15803D" },
	cancelled: { bg: "#F4E4E4", fg: "#B91C1C" },
};

export const PRIORITY_COLORS: Record<string, { bg: string; fg: string }> = {
	low: { bg: "#EFEAE2", fg: "#5B6573" },
	medium: { bg: "#E0ECFB", fg: "#1D4E89" },
	high: { bg: "#FBEDE5", fg: "#B45309" },
	urgent: { bg: "#F4E4E4", fg: "#B91C1C" },
};

export const ACTION_COLORS: Record<string, { bg: string; fg: string }> = {
	create: { bg: "#DCFCE7", fg: "#15803D" },
	update: { bg: "#E0ECFB", fg: "#1D4E89" },
	delete: { bg: "#F4E4E4", fg: "#B91C1C" },
	login: { bg: "#EFEAE2", fg: "#5B6573" },
	logout: { bg: "#EFEAE2", fg: "#5B6573" },
	export: { bg: "#FBEDE5", fg: "#B45309" },
};
