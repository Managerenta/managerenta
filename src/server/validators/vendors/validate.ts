import zod from "zod";

const specialtyEnum = zod.enum([
	"plumbing",
	"electrical",
	"hvac",
	"appliance",
	"structural",
	"pest",
	"cleaning",
	"general",
	"other",
]);

export const createVendorBodySchema = zod.object({
	name: zod.string().min(1).max(200),
	company: zod.string().max(200).optional(),
	specialty: specialtyEnum,
	phone: zod.string().min(7).max(20).optional(),
	email: zod.string().email().optional(),
	address: zod.string().max(500).optional(),
	notes: zod.string().max(2000).optional(),
	rating: zod.coerce.number().min(0).max(5).optional(),
});

export const updateVendorBodySchema = createVendorBodySchema.partial();

export const vendorParamsSchema = zod
	.object({ id: zod.string().min(1) })
	.strict();

export const getVendorsQuerySchema = zod.object({
	limit: zod.coerce.number().int().min(1).max(100).optional(),
	offset: zod.coerce.number().int().min(0).optional(),
	specialty: zod.union([specialtyEnum, zod.literal("all")]).optional(),
	search: zod.string().optional(),
});
