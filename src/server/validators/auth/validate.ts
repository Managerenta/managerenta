import { z as zod } from "zod";

const patternEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const loginBodySchema = zod
	.object({
		email: zod.email({
			pattern: patternEmail,
		}),
		password: zod.string().min(1).max(128),
	})
	.strict();
