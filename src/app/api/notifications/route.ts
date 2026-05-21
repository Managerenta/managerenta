import { z as zod } from "zod";
import { ErrInvalidFields } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { listNotifications } from "@/server/services";

export const runtime = "nodejs";

const querySchema = zod
	.object({
		limit: zod.coerce.number().int().min(1).max(100).optional(),
		offset: zod.coerce.number().int().min(0).optional(),
	})
	.strict();

export const GET = withApiHandler(
	{ route: "/api/notifications" },
	withAuth(async ({ req, auth }) => {
		try {
			const url = new URL(req.url);
			const queryObj = Object.fromEntries(url.searchParams.entries());
			const parsed = querySchema.safeParse(queryObj);
			if (!parsed.success) throw ErrInvalidFields;

			const result = await listNotifications({
				userId: auth.userId,
				limit: parsed.data.limit,
				offset: parsed.data.offset,
			});
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);
