import { z as zod } from "zod";
import { ErrInvalidFields, ErrResourceNotFound } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import {
	getPlatformOrganizationDetail,
	setOrganizationSuspended,
} from "@/server/services/platform";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = zod.object({ suspended: zod.boolean() }).strict();

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/admin/organizations/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"organizations:Read",
				arn.platform.organizations(id),
				{ req },
			);
			const detail = await getPlatformOrganizationDetail({ orgId: id });
			if (!detail) throw ErrResourceNotFound;
			return ok(detail);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/admin/organizations/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"organizations:Suspend",
				arn.platform.organizations(id),
				{ req },
			);
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = patchSchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const result = await setOrganizationSuspended({
				orgId: id,
				suspended: parsed.data.suspended,
			});
			if (!result) throw ErrResourceNotFound;
			return ok(
				result,
				parsed.data.suspended
					? "Organization suspended"
					: "Organization reactivated",
			);
		} catch (error) {
			return handleError(error);
		}
	}),
);
