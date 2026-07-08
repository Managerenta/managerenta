import { z as zod } from "zod";
import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { adminDeleteGroup, adminSetGroupPolicies } from "@/server/iam/admin";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = zod
	.object({ attachedPolicyIds: zod.array(zod.string()) })
	.strict();

const scope = { plane: "platform", orgId: null } as const;

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/admin/iam/groups/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "iam:AttachPolicy", arn.platform.iam(), { req });
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = patchSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await adminSetGroupPolicies({
				scope,
				groupId: id,
				attachedPolicyIds: parsed.data.attachedPolicyIds,
			});
			if (!result) throw ErrInvalidAction;
			return ok(result, "Group policies updated");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/admin/iam/groups/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "iam:DeleteGroup", arn.platform.iam(), { req });
			const result = await adminDeleteGroup({ scope, groupId: id });
			if (!result) throw ErrInvalidAction;
			return ok(null, "Group deleted");
		} catch (error) {
			return handleError(error);
		}
	}),
);
