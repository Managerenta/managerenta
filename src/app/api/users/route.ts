import type { NextRequest } from "next/server";
import {
	ErrAccountCreationFailed,
	ErrInvalidFields,
	ErrUserNotFound,
} from "@/server/constants";
import {
	created,
	handleError,
	ok,
	parseMultipart,
	singleFileBuffer,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { createUser, deleteUser, updateUser } from "@/server/services";
import {
	createUserBodySchema,
	updateUserBodySchema,
} from "@/server/validators/users/validate";

export const runtime = "nodejs";

export const POST = withApiHandler({ route: "/api/users" }, async ({ req }) => {
	try {
		const parsed = await parseMultipart(req as NextRequest);
		const avatar = singleFileBuffer(parsed, "avatar");

		const body = createUserBodySchema.safeParse(parsed.fields);
		if (!body.success) throw ErrInvalidFields;

		const result = await createUser({ payload: { ...body.data, avatar } });
		if (!result) throw ErrAccountCreationFailed;

		return created(result, "User created successfully");
	} catch (error) {
		return handleError(error);
	}
});

export const PATCH = withApiHandler(
	{ route: "/api/users" },
	withAuth(async ({ req, auth }) => {
		try {
			const parsed = await parseMultipart(req as NextRequest);
			const avatar = singleFileBuffer(parsed, "avatar");

			const body = updateUserBodySchema.safeParse(parsed.fields);
			if (!body.success) throw ErrInvalidFields;

			const result = await updateUser({
				id: auth.userId,
				payload: { ...body.data, avatar },
			});
			if (!result) throw ErrUserNotFound;

			return ok(result, "User updated successfully");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler(
	{ route: "/api/users" },
	withAuth(async ({ auth }) => {
		try {
			const result = await deleteUser({ id: auth.userId });
			if (!result) throw ErrUserNotFound;
			return ok(result, "User deleted successfully");
		} catch (error) {
			return handleError(error);
		}
	}),
);
