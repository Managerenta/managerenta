import { z as zod } from "zod";
import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { switchOrganization } from "@/server/services";

export const runtime = "nodejs";

const bodySchema = zod
	.object({
		organizationId: zod.string().nullable(),
	})
	.strict();

export const POST = withApiHandler(
	{ route: "/api/organizations/switch" },
	withAuth(async ({ req, auth }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = bodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const result = await switchOrganization({
				userId: auth.userId,
				organizationId: parsed.data.organizationId,
			});
			if (!result) throw ErrInvalidAction;
			return ok(result, "Switched");
		} catch (error) {
			return handleError(error);
		}
	}),
);
