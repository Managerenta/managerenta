import zod from "zod";

const emptyStringToUndefined = zod.literal("").transform(() => undefined);

function optionalDate() {
	return zod.union([emptyStringToUndefined, zod.coerce.date()]).optional();
}

const categoryEnum = zod.enum([
	"plumbing",
	"electrical",
	"hvac",
	"appliance",
	"structural",
	"pest",
	"cleaning",
	"other",
]);

const priorityEnum = zod.enum(["low", "medium", "high", "urgent"]);

const statusEnum = zod.enum([
	"open",
	"in-progress",
	"on-hold",
	"completed",
	"cancelled",
]);

export const createMaintenanceBodySchema = zod.object({
	propertyId: zod.string().min(1),
	unitId: zod.string().min(1).optional(),
	tenantId: zod.string().min(1).optional(),
	vendorId: zod.string().min(1).optional(),
	title: zod.string().min(1).max(200),
	description: zod.string().min(1).max(2000),
	category: categoryEnum,
	priority: priorityEnum.optional(),
	cost: zod.coerce.number().min(0).optional(),
	scheduledDate: optionalDate(),
});

export const updateMaintenanceBodySchema = zod.object({
	title: zod.string().min(1).max(200).optional(),
	description: zod.string().min(1).max(2000).optional(),
	category: categoryEnum.optional(),
	priority: priorityEnum.optional(),
	status: statusEnum.optional(),
	vendorId: zod.string().min(1).optional(),
	cost: zod.coerce.number().min(0).optional(),
	scheduledDate: optionalDate(),
	completedDate: optionalDate(),
});

export const maintenanceParamsSchema = zod
	.object({ id: zod.string().min(1) })
	.strict();

export const getMaintenanceQuerySchema = zod.object({
	limit: zod.coerce.number().int().min(1).max(100).optional(),
	offset: zod.coerce.number().int().min(0).optional(),
	status: zod.union([statusEnum, zod.literal("all")]).optional(),
	priority: zod.union([priorityEnum, zod.literal("all")]).optional(),
	propertyId: zod.string().optional(),
	search: zod.string().optional(),
});
