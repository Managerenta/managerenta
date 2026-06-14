import { ErrInvalidFields, ErrResourceNotFound } from "@/server/constants";
import {
	assertWriteRole,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { deleteVendor, getVendorById, updateVendor } from "@/server/services";
import {
	updateVendorBodySchema,
	vendorParamsSchema,
} from "@/server/validators/vendors/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/vendors/[id]" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			const params = vendorParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const result = await getVendorById({
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

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/vendors/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			assertWriteRole(auth);
			const { id } = await context.params;
			const params = vendorParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			let raw: unknown;
			try {
				raw = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const body = updateVendorBodySchema.safeParse(raw);
			if (!body.success) throw ErrInvalidFields;

			const result = await updateVendor({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
				payload: body.data,
			});
			if (!result) throw ErrResourceNotFound;
			return ok(result, "Vendor updated");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/vendors/[id]" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			assertWriteRole(auth);
			const { id } = await context.params;
			const params = vendorParamsSchema.safeParse({ id });
			if (!params.success) throw ErrInvalidFields;

			const deleted = await deleteVendor({
				id: params.data.id,
				userId: auth.effectiveOwnerId,
			});
			if (!deleted) throw ErrResourceNotFound;
			return ok(null, "Vendor deleted");
		} catch (error) {
			return handleError(error);
		}
	}),
);
