import { z as zod } from "zod";
import { ErrInvalidFields } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { adminCreateGroup, adminListGroups } from "@/server/iam/admin";
import {
	created,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const createSchema = zod
	.object({
		name: zod.string().min(1),
		attachedPolicyIds: zod.array(zod.string()).optional(),
	})
	.strict();

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/iam/groups" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "iam:List", arn.org.iam(id), { req });
			const groups = await adminListGroups({ plane: "org", orgId: id });
			return ok(groups);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/iam/groups" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "iam:CreateGroup", arn.org.iam(id), { req });
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = createSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await adminCreateGroup({
				scope: { plane: "org", orgId: id },
				name: parsed.data.name,
				attachedPolicyIds: parsed.data.attachedPolicyIds,
			});
			if (!result) throw ErrInvalidFields;
			return created(result, "Group created");
		} catch (error) {
			return handleError(error);
		}
	}),
);
