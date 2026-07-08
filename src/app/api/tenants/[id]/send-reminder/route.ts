import { ErrInvalidFields, ErrTenantNotFound } from "@/server/constants";
import { arn, authorize, resourceScope } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { sendRentReminder } from "@/server/services";
import { tenantParamsSchema } from "@/server/validators/tenants/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withApiHandler<RouteContext>(
	{
		route: "/api/tenants/[id]/send-reminder",
		// Sends outbound email/SMS to the tenant — throttle well below the
		// global default so the address can't be bombed.
		rateLimit: { windowMs: 60 * 60 * 1000, maxRequests: 30 },
	},
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"tenants:SendReminder",
				arn.org.tenants(resourceScope(auth), id),
				{ req },
			);
			const params = tenantParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const result = await sendRentReminder({
				tenantId: params.data.id,
				userId: auth.effectiveOwnerId,
			});
			if (!result) throw ErrTenantNotFound;
			return ok(
				{
					sent: result.sent,
					failed: result.failed,
					tenant: result.tenant,
				},
				`Reminder dispatched (${result.sent} sent, ${result.failed} failed)`,
			);
		} catch (error) {
			return handleError(error);
		}
	}),
);
