import { ErrInvalidFields, ErrTryAgain } from "@/server/constants";
import { arn, authorize, resourceScope } from "@/server/iam";
import {
	created,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { createVendor, getVendors } from "@/server/services";
import {
	createVendorBodySchema,
	getVendorsQuerySchema,
} from "@/server/validators/vendors/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/vendors" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(
				auth,
				"vendors:List",
				arn.org.vendors(resourceScope(auth)),
				{ req },
			);
			const url = new URL(req.url);
			const query = getVendorsQuerySchema.safeParse(
				Object.fromEntries(url.searchParams),
			);
			if (!query.success) throw ErrInvalidFields;

			const result = await getVendors({
				userId: auth.effectiveOwnerId,
				...query.data,
			});
			return ok(result);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler(
	{ route: "/api/vendors" },
	withAuth(async ({ req, auth }) => {
		try {
			await authorize(
				auth,
				"vendors:Create",
				arn.org.vendors(resourceScope(auth)),
				{ req },
			);
			let raw: unknown;
			try {
				raw = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const body = createVendorBodySchema.safeParse(raw);
			if (!body.success) throw ErrInvalidFields;

			const result = await createVendor({
				userId: auth.effectiveOwnerId,
				...body.data,
			});
			if (!result) throw ErrTryAgain;
			return created(result, "Vendor created");
		} catch (error) {
			return handleError(error);
		}
	}),
);
