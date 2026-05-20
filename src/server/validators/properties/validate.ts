import zod from "zod";

const propertyTypes = [
	"Apartment",
	"House",
	"Commercial",
	"Land",
	"Studio",
	"Duplex",
	"Highrise",
	"Bungalow",
] as const;

export const createPropertyBodySchema = zod.object({
	name: zod.string().min(1).max(200),
	address: zod.string().min(1).max(500),
	type: zod.enum(propertyTypes),
	totalUnits: zod.coerce.number().int().min(0).default(0),
	monthlyRent: zod.coerce.number().min(0).optional(),
	description: zod.string().max(1000).optional(),
});

export const getPropertiesQuerySchema = zod
	.object({
		limit: zod.coerce.number().int().min(1).max(100).optional(),
		offset: zod.coerce.number().int().min(0).optional(),
	})
	.strict();

export const getPropertyByIdParamsSchema = zod
	.object({
		id: zod.string().min(1),
	})
	.strict();

export const updatePropertyBodySchema = zod.object({
	name: zod.string().min(1).max(200).optional(),
	address: zod.string().min(1).max(500).optional(),
	type: zod.enum(propertyTypes).optional(),
	totalUnits: zod.coerce.number().int().min(1).optional(),
	monthlyRent: zod.coerce.number().min(0).optional(),
	description: zod.string().max(1000).optional(),
	image: zod.string().optional(),
});

export const updatePropertyParamsSchema = zod
	.object({
		id: zod.string().min(1),
	})
	.strict();
