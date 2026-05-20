import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import {
	ErrInvalidFields,
	ErrMissingFile,
	ErrResourceAlreadyExist,
} from "@/server/constants";
import {
	created,
	handleError,
	parseMultipart,
	singleFileBuffer,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { createOrganization } from "@/server/services";
import { createOrganizationBodySchema } from "@/server/validators/organizations/validate";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{ route: "/api/organizations" },
	withAuth(async ({ req, auth }) => {
		try {
			const parsed = await parseMultipart(req as NextRequest);
			const logo = singleFileBuffer(parsed, "logo");
			if (!logo) throw ErrMissingFile;

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
