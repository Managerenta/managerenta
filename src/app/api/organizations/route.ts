import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { ErrInvalidFields, ErrResourceAlreadyExist } from "@/server/constants";
import {
	created,
	handleError,
	ok,
	parseMultipart,
	singleFileBuffer,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { createOrganization, getMyOrganizations } from "@/server/services";
import { createOrganizationBodySchema } from "@/server/validators/organizations/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/organizations" },
	withAuth(async ({ auth }) => {
		try {
			const orgs = await getMyOrganizations({ userId: auth.userId });
			return ok({
				organizations: orgs,
				currentOrganizationId: auth.organizationId,
				role: auth.role,
			});
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler(
	{ route: "/api/organizations" },
	withAuth(async ({ req, auth }) => {
		try {
			const parsed = await parseMultipart(req as NextRequest);
			const logo = singleFileBuffer(parsed, "logo") ?? undefined;

			const body = createOrganizationBodySchema.safeParse(parsed.fields);
			if (!body.success) throw ErrInvalidFields;

			const result = await createOrganization({
				payload: {
					...body.data,
					logo,
					ownerId: new mongoose.Types.ObjectId(auth.userId),
				},
			});
			if (!result) throw ErrResourceAlreadyExist;
			return created(result, "Organization created successfully");
		} catch (error) {
			return handleError(error);
		}
	}),
);
