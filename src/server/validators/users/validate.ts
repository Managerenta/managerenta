import { z as zod } from "zod";
import { MAX_LIMIT } from "../../constants";

const patternEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createUserBodySchema = zod
	.object({
		username: zod.string().min(3).max(30),
		email: zod.email({
			pattern: patternEmail,
		}),
		password: zod.string().min(6).max(100),
		name: zod.string().min(1).max(100),
	})
	.strict();

export const updateUserBodySchema = createUserBodySchema
	.partial()
	.extend({
		phone: zod.string().min(7).max(20).optional(),
	})
	.strict();

export const changePasswordBodySchema = zod
	.object({
		currentPassword: zod.string().min(6).max(100),
		newPassword: zod.string().min(6).max(100),
	})
	.strict();

export const getUserByEmailQuerySchema = zod
	.object({
		email: zod.email({
			pattern: patternEmail,
		}),
	})
	.strict();

export const getUserByIdParamsSchema = zod
	.object({
		id: zod.string(),
	})
	.strict();

export const getUsersByIdsBodySchema = zod
	.object({
		ids: zod.array(zod.string()).min(1),
	})
	.strict();

export const getUsersByIdsQuerySchema = zod
	.object({
		offset: zod.coerce.number().min(0).default(0),
		limit: zod.coerce.number().min(1).max(MAX_LIMIT).default(MAX_LIMIT),
	})
	.strict();

export const getUsersByEmailsBodySchema = zod
	.object({
		emails: zod.array(zod.string()).min(1),
	})
	.strict();

export const getUsersByEmailsQuerySchema = zod
	.object({
		offset: zod.coerce.number().min(0).default(0),
		limit: zod.coerce.number().min(1).max(MAX_LIMIT).default(MAX_LIMIT),
	})
	.strict();
