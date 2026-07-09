import { arn, authorize } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { listOrgGroupsForMembership } from "@/server/services/platform";

export const runtime = "nodejs";

// Read-only catalogue of every org-plane group (labelled with its owning org),
// used by the operator Users console to offer group-membership targets.
export const GET = withApiHandler(
	{ route: "/api/admin/iam/org-groups" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(auth, "iam:List", arn.platform.iam(), { req });
			const groups = await listOrgGroupsForMembership();
			return ok(groups);
		} catch (error) {
			return handleError(error);
		}
	}),
);
