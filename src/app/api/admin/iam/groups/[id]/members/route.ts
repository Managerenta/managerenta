import { z as zod } from "zod";
import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { adminAddMember, adminListGroupMembers } from "@/server/iam/admin";
import {
	created,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const addSchema = zod
	.object({
		principalType: zod.enum(["user", "operator"]),
		principalId: zod.string().min(1),
	})
	.strict();

const scope = { plane: "platform", orgId: null } as const;

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/admin/iam/groups/[id]/members" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "iam:List", arn.platform.iam(), { req });
			const members = await adminListGroupMembers({ groupId: id });
			return ok(members);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler<RouteContext>(
	{ route: "/api/admin/iam/groups/[id]/members" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "iam:AddMember", arn.platform.iam(), { req });
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = addSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await adminAddMember({
				scope,
				groupId: id,
				principalType: parsed.data.principalType,
				principalId: parsed.data.principalId,
			});
			if (!result) throw ErrInvalidAction;
			return created(null, "Member added");
		} catch (error) {
			return handleError(error);
		}
	}),
);
