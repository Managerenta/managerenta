import zod from "zod";

export const addUnitBodySchema = zod.object({
	name: zod.string().min(1).max(200),
	rent: zod.number().min(0),
});

export const addUnitParamsSchema = zod
	.object({
		propertyId: zod.string().min(1),
	})
	.strict();

export const getUnitsQuerySchema = zod.object({
	status: zod.enum(["Vacant", "Occupied"]).optional(),
	limit: zod.coerce.number().int().min(1).max(100).optional(),
});
