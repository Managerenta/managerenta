import { z as zod } from "zod";
import { ErrInvalidFields } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { adminCreatePolicy, adminListPolicies } from "@/server/iam/admin";
import {
	created,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";

export const runtime = "nodejs";

const statementSchema = zod
	.object({
		sid: zod.string().optional(),
		effect: zod.enum(["Allow", "Deny"]),
		action: zod.array(zod.string().min(1)).min(1),
		resource: zod.array(zod.string().min(1)).min(1),
		condition: zod
			.record(zod.string(), zod.record(zod.string(), zod.array(zod.string())))
			.optional(),
	})
	.strict();

const policyDocumentSchema = zod
	.object({
		version: zod.string().min(1),
		statements: zod.array(statementSchema),
	})
	.strict();

const createSchema = zod
	.object({ name: zod.string().min(1), document: policyDocumentSchema })
	.strict();

const scope = { plane: "platform", orgId: null } as const;

export const GET = withApiHandler(
	{ route: "/api/admin/iam/policies" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(auth, "iam:List", arn.platform.iam(), { req });
			const policies = await adminListPolicies(scope);
			return ok(policies);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler(
	{ route: "/api/admin/iam/policies" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(auth, "iam:PutPolicy", arn.platform.iam(), { req });
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = createSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await adminCreatePolicy({
				scope,
				name: parsed.data.name,
				document: parsed.data.document,
			});
			if (!result) throw ErrInvalidFields;
			return created(result, "Policy created");
		} catch (error) {
			return handleError(error);
		}
	}),
);
