import { z as zod } from "zod";
import { ErrInvalidFields, ErrResourceNotFound } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { adminSetOperatorStatus } from "@/server/iam/admin";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ userId: string }> };

const patchSchema = zod
	.object({ status: zod.enum(["active", "disabled"]) })
	.strict();

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/admin/iam/operators/[userId]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { userId } = await context.params;
			await authorize(auth, "iam:DisableOperator", arn.platform.iam(), {
				req,
			});
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = patchSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await adminSetOperatorStatus({
				userId,
				status: parsed.data.status,
			});
			if (!result) throw ErrResourceNotFound;
			return ok(
				null,
				parsed.data.status === "active"
					? "Operator activated"
					: "Operator disabled",
			);
		} catch (error) {
			return handleError(error);
		}
	}),
);
