import { z as zod } from "zod";
import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { adminDeletePolicy, adminUpdatePolicy } from "@/server/iam/admin";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const statementSchema = zod
	.object({
		sid: zod.string().optional(),
		effect: zod.enum(["Allow", "Deny"]),
		action: zod.array(zod.string().min(1)).min(1),
		resource: zod.array(zod.string().min(1)).min(1),
		condition: zod
			.record(
				zod.string(),
				zod.record(zod.string(), zod.array(zod.string())),
			)
			.optional(),
	})
	.strict();

const policyDocumentSchema = zod
	.object({
		version: zod.string().min(1),
		statements: zod.array(statementSchema),
	})
	.strict();

const patchSchema = zod.object({ document: policyDocumentSchema }).strict();

const scope = { plane: "platform", orgId: null } as const;

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/admin/iam/policies/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "iam:PutPolicy", arn.platform.iam(), { req });
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = patchSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await adminUpdatePolicy({
				scope,
				policyId: id,
				document: parsed.data.document,
			});
			if (!result) throw ErrInvalidAction;
			return ok(result, "Policy updated");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/admin/iam/policies/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "iam:DeletePolicy", arn.platform.iam(), {
				req,
			});
			const result = await adminDeletePolicy({ scope, policyId: id });
			if (!result) throw ErrInvalidAction;
			return ok(null, "Policy deleted");
		} catch (error) {
			return handleError(error);
		}
	}),
);
