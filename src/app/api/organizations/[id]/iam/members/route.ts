import { z as zod } from "zod";
import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import {
	adminAddMember,
	adminListOrgMemberships,
	adminRemoveMember,
} from "@/server/iam/admin";
import {
	created,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const memberSchema = zod
	.object({
		groupId: zod.string().min(1),
		principalId: zod.string().min(1),
	})
	.strict();

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/iam/members" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "iam:List", arn.org.iam(id), { req });
			const members = await adminListOrgMemberships({ orgId: id });
			return ok(members);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/iam/members" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "iam:AddMember", arn.org.iam(id), { req });
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = memberSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await adminAddMember({
				scope: { plane: "org", orgId: id },
				groupId: parsed.data.groupId,
				principalType: "user",
				principalId: parsed.data.principalId,
			});
			if (!result) throw ErrInvalidAction;
			return created(null, "Member added");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/iam/members" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "iam:RemoveMember", arn.org.iam(id), { req });
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = memberSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await adminRemoveMember({
				scope: { plane: "org", orgId: id },
				groupId: parsed.data.groupId,
				principalType: "user",
				principalId: parsed.data.principalId,
			});
			if (!result) throw ErrInvalidAction;
			return ok(null, "Member removed");
		} catch (error) {
			return handleError(error);
		}
	}),
);
