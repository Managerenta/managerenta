import { ErrInvalidFields, ErrResourceNotFound } from "@/server/constants";
import { arn, authorize, resourceScope } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { deleteTransaction, updateTransaction } from "@/server/services";
import {
	transactionParamsSchema,
	updateTransactionBodySchema,
} from "@/server/validators/tenants/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; txId: string }> };

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/tenants/[id]/transactions/[txId]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id, txId } = await context.params;
			await authorize(
				auth,
				"tenants:Update",
				arn.org.tenants(resourceScope(auth), id),
				{ req },
			);
			const params = transactionParamsSchema.safeParse({ id, txId });
			if (!params.success) throw ErrInvalidFields;

			let raw: unknown;
			try {
				raw = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const body = updateTransactionBodySchema.safeParse(raw);
			if (!body.success) throw ErrInvalidFields;

			const result = await updateTransaction({
				id: params.data.txId,
				tenantId: params.data.id,
				userId: auth.effectiveOwnerId,
				payload: body.data,
			});
			if (!result) throw ErrResourceNotFound;
			return ok(result, "Transaction updated");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/tenants/[id]/transactions/[txId]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id, txId } = await context.params;
			await authorize(
				auth,
				"tenants:Update",
				arn.org.tenants(resourceScope(auth), id),
				{ req },
			);
			const params = transactionParamsSchema.safeParse({ id, txId });
			if (!params.success) throw ErrInvalidFields;

			const result = await deleteTransaction({
				id: params.data.txId,
				tenantId: params.data.id,
				userId: auth.effectiveOwnerId,
			});
			if (!result) throw ErrResourceNotFound;
			return ok(null, "Transaction deleted");
		} catch (error) {
			return handleError(error);
		}
	}),
);
