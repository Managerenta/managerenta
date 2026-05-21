import { z as zod } from "zod";
import { ErrInvalidFields, ErrResourceNotFound } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { assertOrganizationAdmin } from "@/server/middleware/organizations";
import { Organization } from "@/server/models";
import { deleteOrganization, getOrganizationById } from "@/server/services";

const updateBodySchema = zod
	.object({
		name: zod.string().min(1).max(100).optional(),
		description: zod.string().min(5).max(256).optional(),
		website: zod.string().url().optional().or(zod.literal("")),
		x: zod.string().optional(),
		instagram: zod.string().optional(),
		telegram: zod.string().optional(),
	})
	.strict();

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			const org = await getOrganizationById({ organizationId: id });
			if (!org) throw ErrResourceNotFound;
			const isMember =
				org.ownerId.toString() === auth.userId ||
				org.members?.some((m) => m.memberId.toString() === auth.userId);
			if (!isMember) throw ErrResourceNotFound;
			return ok(org);
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await assertOrganizationAdmin({
				userId: auth.userId,
				organizationId: id,
			});
			let raw: unknown;
			try {
				raw = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = updateBodySchema.safeParse(raw);
			if (!parsed.success) throw ErrInvalidFields;
			const updated = await Organization.findByIdAndUpdate(
				id,
				parsed.data,
				{ returnDocument: "after" },
			);
			if (!updated) throw ErrResourceNotFound;
			return ok(updated, "Organization updated");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			await assertOrganizationAdmin({
				userId: auth.userId,
				organizationId: id,
			});
			const result = await deleteOrganization({ organizationId: id });
			if (!result) throw ErrResourceNotFound;
			return ok(null, "Organization deleted");
		} catch (error) {
			return handleError(error);
		}
	}),
);
