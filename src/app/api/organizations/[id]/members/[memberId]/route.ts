import { z as zod } from "zod";
import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { assertOrganizationAdmin } from "@/server/middleware/organizations";
import { removeMemberDB, setMemberRoleDB } from "@/server/models";
import { IOrganizationRole } from "@/server/models/organizations/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; memberId: string }> };

const patchBodySchema = zod
	.object({
		role: zod.enum([
			IOrganizationRole.ADMIN,
			IOrganizationRole.MANAGER,
			IOrganizationRole.VIEWER,
		]),
	})
	.strict();

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/members/[memberId]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id, memberId } = await context.params;
			await assertOrganizationAdmin({
				userId: auth.userId,
				organizationId: id,
			});
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = patchBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const result = await setMemberRoleDB({
				orgId: id,
				memberId,
				role: parsed.data.role,
			});
			if (!result) throw ErrInvalidAction;
			return ok(result, "Role updated");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/members/[memberId]" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id, memberId } = await context.params;
			await assertOrganizationAdmin({
				userId: auth.userId,
				organizationId: id,
			});
			const result = await removeMemberDB({ orgId: id, memberId });
			if (!result) throw ErrInvalidAction;
			return ok(null, "Member removed");
		} catch (error) {
			return handleError(error);
		}
	}),
);
