import zod from "zod";

export const getAuditQuerySchema = zod.object({
	limit: zod.coerce.number().int().min(1).max(100).optional(),
	offset: zod.coerce.number().int().min(0).optional(),
	entityType: zod.string().optional(),
	action: zod.string().optional(),
});
