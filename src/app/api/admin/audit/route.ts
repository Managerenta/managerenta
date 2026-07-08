import { z as zod } from "zod";
import { arn, authorize } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { listPlatformAudit } from "@/server/services/platform";

export const runtime = "nodejs";

const querySchema = zod.object({
	limit: zod.coerce.number().int().min(1).max(100).optional(),
	offset: zod.coerce.number().int().min(0).optional(),
	entityType: zod.string().max(40).optional(),
	action: zod.string().max(40).optional(),
	organizationId: zod.string().max(64).optional(),
	ownerId: zod.string().max(64).optional(),
});

export const GET = withApiHandler(
	{ route: "/api/admin/audit" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(auth, "audit:List", arn.platform.audit(), { req });
			const url = new URL(req.url);
			const parsed = querySchema.safeParse(
				Object.fromEntries(url.searchParams.entries()),
			);
			const q = parsed.success ? parsed.data : {};
			const data = await listPlatformAudit({
				limit: q.limit ?? 50,
				offset: q.offset ?? 0,
				entityType: q.entityType,
				action: q.action,
				organizationId: q.organizationId,
				ownerId: q.ownerId,
			});
			return ok(data);
		} catch (error) {
			return handleError(error);
		}
	}),
);
