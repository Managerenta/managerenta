import { ErrInvalidAction } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { adminRemoveMember } from "@/server/iam/admin";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";

export const runtime = "nodejs";

type RouteContext = {
	params: Promise<{ id: string; principalId: string }>;
};

const scope = { plane: "platform", orgId: null } as const;

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/admin/iam/groups/[id]/members/[principalId]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id, principalId } = await context.params;
			await authorize(auth, "iam:RemoveMember", arn.platform.iam(), { req });
			const type =
				new URL(req.url).searchParams.get("type") === "user"
					? "user"
					: "operator";
			const result = await adminRemoveMember({
				scope,
				groupId: id,
				principalType: type,
				principalId,
			});
			if (!result) throw ErrInvalidAction;
			return ok(null, "Member removed");
		} catch (error) {
			return handleError(error);
		}
	}),
);
