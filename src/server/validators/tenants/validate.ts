import zod from "zod";

const emptyStringToUndefined = zod.literal("").transform(() => undefined);

function optionalDate() {
	return zod.union([emptyStringToUndefined, zod.coerce.date()]).optional();
}

function optionalInt(min: number, max: number) {
	return zod
		.union([
			emptyStringToUndefined,
			zod.coerce.number().int().min(min).max(max),
		])
		.optional();
}

export const addTenantBodySchema = zod.object({
	name: zod.string().min(1).max(200),
	phone: zod.string().min(7).max(20),
	email: zod.string().email(),
	unitId: zod.string().min(1),
	moveInDate: zod.coerce.date(),
	leaseExpiry: optionalDate(),
	rentDueDay: optionalInt(1, 28),
});

export const updateTenantBodySchema = zod.object({
	name: zod.string().min(1).max(200).optional(),
	phone: zod.string().min(7).max(20).optional(),
	email: zod.string().email().optional(),
	moveInDate: optionalDate(),
	leaseExpiry: optionalDate(),
	rentDueDay: optionalInt(1, 28),
});

export const tenantParamsSchema = zod
	.object({ id: zod.string().min(1) })
	.strict();

export const getTenantsQuerySchema = zod.object({
	limit: zod.coerce.number().int().min(1).max(100).optional(),
	offset: zod.coerce.number().int().min(0).optional(),
	status: zod.enum(["Active", "Inactive", "all"]).optional(),
	search: zod.string().optional(),
	sort: zod.string().optional(),
});

export const addTransactionBodySchema = zod.object({
	type: zod.enum(["rent", "maintenance", "utilities", "other"]),
	description: zod.string().min(1).max(500).optional(),
	amount: zod.coerce.number().min(0),
	amountType: zod.enum(["credit", "debit"]).default("credit"),
	paymentMethod: zod.enum([
		"bank-transfer",
		"cash",
		"mobile-money",
		"card",
		"check",
	]),
	date: zod.coerce.date(),
	period: zod.coerce.number().int().min(1).max(120).default(1),
});
