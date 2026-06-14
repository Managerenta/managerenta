import { ErrInvalidFields, ErrResourceNotFound } from "@/server/constants";
import {
	assertWriteRole,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { deleteDocument, getDocumentById } from "@/server/services";
import { documentParamsSchema } from "@/server/validators/documents/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/documents/[id]" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			const params = documentParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const result = await getDocumentById({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
			});
			if (!result) throw ErrResourceNotFound;
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/documents/[id]" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			assertWriteRole(auth);
			const { id } = await context.params;
			const params = documentParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const deleted = await deleteDocument({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
			});
			if (!deleted) throw ErrResourceNotFound;
			return ok(null, "Document deleted");
		} catch (error) {
			return handleError(error);
		}
	}),
);
