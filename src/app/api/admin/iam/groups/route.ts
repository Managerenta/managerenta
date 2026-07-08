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

const createSchema = zod
	.object({
		name: zod.string().min(1),
		attachedPolicyIds: zod.array(zod.string()).optional(),
	})
	.strict();

const scope = { plane: "platform", orgId: null } as const;

export const GET = withApiHandler(
	{ route: "/api/admin/iam/groups" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(auth, "iam:List", arn.platform.iam(), { req });
			const groups = await adminListGroups(scope);
			return ok(groups);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler(
	{ route: "/api/admin/iam/groups" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(auth, "iam:CreateGroup", arn.platform.iam(), { req });
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = createSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await adminCreateGroup({
				scope,
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
