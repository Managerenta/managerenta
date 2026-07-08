import { z as zod } from "zod";
import { arn, authorize } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getPlatformOrganizations } from "@/server/services/platform";

export const runtime = "nodejs";

const querySchema = zod.object({
	search: zod.string().max(100).optional(),
	offset: zod.coerce.number().int().min(0).optional(),
	limit: zod.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withApiHandler(
	{ route: "/api/admin/organizations" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(
				auth,
				"organizations:List",
				arn.platform.organizations(),
				{ req },
			);
			const url = new URL(req.url);
			const parsed = querySchema.safeParse({
				search: url.searchParams.get("search") ?? undefined,
				offset: url.searchParams.get("offset") ?? undefined,
				limit: url.searchParams.get("limit") ?? undefined,
			});
			const q = parsed.success ? parsed.data : {};
			const data = await getPlatformOrganizations({
				search: q.search ?? "",
				offset: q.offset ?? 0,
				limit: q.limit ?? 20,
			});
			return ok(data);
		} catch (error) {
			return handleError(error);
		}
	}),
);
