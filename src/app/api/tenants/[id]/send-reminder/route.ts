import { ErrInvalidFields, ErrTenantNotFound } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getTenantById } from "@/server/services";
import { tenantParamsSchema } from "@/server/validators/tenants/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withApiHandler<RouteContext>(
	{ route: "/api/tenants/[id]/send-reminder" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			const params = tenantParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const tenant = await getTenantById({
				id: params.data.id,
				userId: auth.userId,
			});
			if (!tenant) throw ErrTenantNotFound;
			return ok(null, "Reminder sent");
		} catch (error) {
			return handleError(error);
		}
	}),
);
