import { z as zod } from "zod";
import { ErrInvalidFields, ErrResourceNotFound } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import {
	getPlatformUserDetail,
	setPlatformUserStatus,
} from "@/server/services/platform";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = zod
	.object({ status: zod.enum(["active", "suspended"]) })
	.strict();

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/admin/users/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "users:Read", arn.platform.users(id), {
				req,
			});
			const detail = await getPlatformUserDetail({ userId: id });
			if (!detail) throw ErrResourceNotFound;
			return ok(detail);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/admin/users/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(auth, "users:Update", arn.platform.users(id), {
				req,
			});
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = patchSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await setPlatformUserStatus({
				userId: id,
				status: parsed.data.status,
			});
			if (!result) throw ErrResourceNotFound;
			return ok(
				result,
				parsed.data.status === "suspended"
					? "User suspended"
					: "User reactivated",
			);
		} catch (error) {
			return handleError(error);
		}
	}),
);
