import { z as zod } from "zod";
import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { acceptInvite } from "@/server/services";

export const runtime = "nodejs";

const bodySchema = zod.object({ token: zod.string().min(10) }).strict();

export const POST = withApiHandler(
	{ route: "/api/organizations/invites/accept" },
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
			const org = await acceptInvite({
				token: parsed.data.token,
				userId: auth.userId,
			});
			if (!org) throw ErrInvalidAction;
			const orgWithId = org as typeof org & {
				_id: { toString(): string };
			};
			return ok({
				organizationId: orgWithId._id.toString(),
				name: org.name,
			});
		} catch (error) {
			return handleError(error);
		}
	}),
);
