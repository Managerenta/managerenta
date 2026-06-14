import zod from "zod";

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

export const portalMaintenanceBodySchema = zod.object({
	title: zod.string().min(1).max(200),
	description: zod.string().min(1).max(2000),
	category: categoryEnum,
});
