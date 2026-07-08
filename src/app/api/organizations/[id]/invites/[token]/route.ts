import { ErrInvalidAction } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { revokeInviteDB } from "@/server/models";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; token: string }> };

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/invites/[token]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id, token } = await context.params;
			await authorize(
				auth,
				"organizations:InviteMember",
				arn.org.organizations(id),
				{ req },
			);
			// `token` here is the *stored value* (hashed at rest per H6),
			// which is what the admin UI received from GET /members. It is
			// NOT the raw email token — admins can only revoke by reference,
			// not by guessing the raw secret.
			const ok_ = await revokeInviteDB({ orgId: id, token });
			if (!ok_) throw ErrInvalidAction;
			return ok(null, "Invitation revoked");
		} catch (error) {
			return handleError(error);
		}
	}),
);
