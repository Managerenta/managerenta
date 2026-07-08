import { z as zod } from "zod";
import {
	ErrInvalidAction,
	ErrInvalidFields,
	ErrResourceAlreadyExist,
	ErrResourceNotFound,
} from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { adminCreateOperator, adminListOperators } from "@/server/iam/admin";
import {
	created,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";

export const runtime = "nodejs";

const createSchema = zod
	.object({ userId: zod.string().regex(/^[0-9a-fA-F]{24}$/) })
	.strict();

export const GET = withApiHandler(
	{ route: "/api/admin/iam/operators" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(auth, "iam:List", arn.platform.iam(), { req });
			const operators = await adminListOperators();
			return ok(operators);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler(
	{ route: "/api/admin/iam/operators" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(auth, "iam:CreateOperator", arn.platform.iam(), {
				req,
			});
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = createSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await adminCreateOperator({
				userId: parsed.data.userId,
			});
			if (!result.ok) {
				if (result.reason === "unknown-user") throw ErrResourceNotFound;
				if (result.reason === "already-operator") {
					throw ErrResourceAlreadyExist;
				}
				throw ErrInvalidAction;
			}
			return created(result, "Operator created");
		} catch (error) {
			return handleError(error);
		}
	}),
);
