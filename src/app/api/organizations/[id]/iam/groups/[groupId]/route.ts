import { z as zod } from "zod";
import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { adminDeleteGroup, adminSetGroupPolicies } from "@/server/iam/admin";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; groupId: string }> };

const patchSchema = zod
	.object({ attachedPolicyIds: zod.array(zod.string()) })
	.strict();

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/iam/groups/[groupId]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id, groupId } = await context.params;
			await authorize(auth, "iam:AttachPolicy", arn.org.iam(id), { req });
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = patchSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await adminSetGroupPolicies({
				scope: { plane: "org", orgId: id },
				groupId,
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
	{ route: "/api/organizations/[id]/iam/groups/[groupId]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id, groupId } = await context.params;
			await authorize(auth, "iam:DeleteGroup", arn.org.iam(id), { req });
			const result = await adminDeleteGroup({
				scope: { plane: "org", orgId: id },
				groupId,
			});
			if (!result) throw ErrInvalidAction;
			return ok(null, "Group deleted");
		} catch (error) {
			return handleError(error);
		}
	}),
);
