import type { NextRequest } from "next/server";
import { ErrAccountCreationFailed, ErrInvalidFields } from "@/server/constants";
import {
	clearAuthCookies,
	created,
	getClientIp,
	handleError,
	parseMultipart,
	setAuthCookies,
	singleFileBuffer,
	withApiHandler,
} from "@/server/lib";
import { signup } from "@/server/services";
import { createUserBodySchema } from "@/server/validators/users/validate";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{ route: "/api/auth/signup" },
	async ({ req }) => {
		try {
			const parsed = await parseMultipart(req as NextRequest);
			const avatar = singleFileBuffer(parsed, "avatar");

			const body = createUserBodySchema.safeParse(parsed.fields);
			if (!body.success) throw ErrInvalidFields;

			const result = await signup({
				payload: { ...body.data, avatar },
				ip: getClientIp(req),
			});
			if (!result) throw ErrAccountCreationFailed;

			await setAuthCookies(result);
			return created(result, "Account created successfully");
		} catch (error) {
			await clearAuthCookies();
			return handleError(error);
		}
	},
);
