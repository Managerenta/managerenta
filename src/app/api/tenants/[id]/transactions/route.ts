import { ErrInvalidFields, ErrTenantNotFound } from "@/server/constants";
import { created, handleError, withApiHandler, withAuth } from "@/server/lib";
import { addTransaction } from "@/server/services";
import {
	addTransactionBodySchema,
	tenantParamsSchema,
} from "@/server/validators/tenants/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withApiHandler<RouteContext>(
	{ route: "/api/tenants/[id]/transactions" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			const params = tenantParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			let raw: unknown;
			try {
				raw = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const body = addTransactionBodySchema.safeParse(raw);
			if (!body.success) throw ErrInvalidFields;

			const result = await addTransaction({
				tenantId: params.data.id,
				userId: auth.userId,
				...body.data,
			});
			if (!result) throw ErrTenantNotFound;
			return created(result, "Transaction added");
		} catch (error) {
			return handleError(error);
		}
	}),
);
