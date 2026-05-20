import { z as zod } from "zod";

export const createOrganizationBodySchema = zod
	.object({
		name: zod.string().min(1).max(100),
		description: zod.string().min(5).max(256),
		website: zod.url().optional(),
		x: zod.string().optional(),
		instagram: zod.string().optional(),
		telegram: zod.string().optional(),
	})
	.strict();

export const deleteOrganizationParamsSchema = zod
	.object({
		organizationId: zod.string(),
	})
	.strict();
