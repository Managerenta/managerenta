import { ErrInvalidFields, ErrResourceNotFound } from "@/server/constants";
import { arn, authorize, resourceScope } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { deleteVendor, getVendorById, updateVendor } from "@/server/services";
import {
	updateVendorBodySchema,
	vendorParamsSchema,
} from "@/server/validators/vendors/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/vendors/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"vendors:Read",
				arn.org.vendors(resourceScope(auth), id),
				{ req },
			);
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
			const { id } = await context.params;
			await authorize(
				auth,
				"vendors:Update",
				arn.org.vendors(resourceScope(auth), id),
				{ req },
			);
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
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"vendors:Delete",
				arn.org.vendors(resourceScope(auth), id),
				{ req },
			);
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
