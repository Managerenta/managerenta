import { z as zod } from "zod";
import {
	ErrInvalidFields,
	ErrResourceNotFound,
	ErrTryAgain,
} from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import {
	addUserGroupMembership,
	removeUserGroupMembership,
} from "@/server/services/platform";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const bodySchema = zod
	.object({ groupId: zod.string().regex(OBJECT_ID) })
	.strict();

export const POST = withApiHandler<RouteContext>(
	{ route: "/api/admin/users/[id]/memberships" },
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
			const parsed = bodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await addUserGroupMembership({
				userId: id,
				groupId: parsed.data.groupId,
			});
			if (!result.ok) {
				if (
					result.reason === "unknown-user" ||
					result.reason === "unknown-group"
				) {
					throw ErrResourceNotFound;
				}
				throw ErrTryAgain;
			}
			return ok({ added: true }, "Added to group");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/admin/users/[id]/memberships" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "iam:RemoveMember", arn.platform.iam(), {
				req,
			});
			const groupId = new URL(req.url).searchParams.get("groupId") ?? "";
			if (!OBJECT_ID.test(groupId)) throw ErrInvalidFields;
			const result = await removeUserGroupMembership({
				userId: id,
				groupId,
			});
			if (!result.ok) {
				if (result.reason === "unknown-group")
					throw ErrResourceNotFound;
				throw ErrTryAgain;
			}
			return ok({ removed: true }, "Removed from group");
		} catch (error) {
			return handleError(error);
		}
	}),
);
