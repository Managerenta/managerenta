import { z as zod } from "zod";
import { arn, authorize } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { listPlatformUsers } from "@/server/services/platform";

export const runtime = "nodejs";

const querySchema = zod.object({
	search: zod.string().max(100).optional(),
	offset: zod.coerce.number().int().min(0).optional(),
	limit: zod.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withApiHandler(
	{ route: "/api/admin/users" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(auth, "users:List", arn.platform.users(), { req });
			const url = new URL(req.url);
			const parsed = querySchema.safeParse({
				search: url.searchParams.get("search") ?? undefined,
				offset: url.searchParams.get("offset") ?? undefined,
				limit: url.searchParams.get("limit") ?? undefined,
			});
			const q = parsed.success ? parsed.data : {};
			const data = await listPlatformUsers({
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
