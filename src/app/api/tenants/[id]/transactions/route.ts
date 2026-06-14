import { ErrInvalidFields, ErrTenantNotFound } from "@/server/constants";
import {
	assertWriteRole,
	created,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { addTransaction, listTransactions } from "@/server/services";
import {
	addTransactionBodySchema,
	tenantParamsSchema,
} from "@/server/validators/tenants/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/tenants/[id]/transactions" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			const params = tenantParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const result = await listTransactions({
				tenantId: params.data.id,
				userId: auth.effectiveOwnerId,
			});
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler<RouteContext>(
	{ route: "/api/tenants/[id]/transactions" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			assertWriteRole(auth);
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
				userId: auth.effectiveOwnerId,
				...body.data,
			});
			if (!result) throw ErrTenantNotFound;
			return created(result, "Transaction added");
		} catch (error) {
			return handleError(error);
		}
	}),
);
