import { z as zod } from "zod";
import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getUsersByIdsDB } from "@/server/models";
import { IOrganizationRole } from "@/server/models/organizations/types";
import { getOrganizationById, inviteMember } from "@/server/services";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const inviteBodySchema = zod
	.object({
		email: zod.string().email(),
		role: zod.enum([
			IOrganizationRole.ADMIN,
			IOrganizationRole.MANAGER,
			IOrganizationRole.VIEWER,
		]),
	})
	.strict();

export const GET = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/members" },
	withAuth<RouteContext>(async ({ auth, context }) => {
		try {
			const { id } = await context.params;
			const org = await getOrganizationById({ organizationId: id });
			if (!org) throw ErrInvalidAction;

			const isMember =
				org.ownerId.toString() === auth.userId ||
				org.members?.some((m) => m.memberId.toString() === auth.userId);
			if (!isMember) throw ErrInvalidAction;

			const memberIds = (org.members ?? []).map((m) =>
				m.memberId.toString(),
			);
			const ownerId = org.ownerId.toString();
			const allIds = Array.from(new Set([ownerId, ...memberIds]));
			const users = await getUsersByIdsDB({
				ids: allIds,
				limit: 100,
				offset: 0,
			});
			const userMap = new Map(users.map((u) => [u._id.toString(), u]));
			const enrichedMembers = (org.members ?? []).map((m) => {
				const u = userMap.get(m.memberId.toString());
				return {
					memberId: m.memberId.toString(),
					permission: m.permission,
					name: u?.name ?? "",
					email: u?.email ?? "",
					avatar: u?.avatar ?? null,
				};
			});
			return ok({
				ownerId,
				members: enrichedMembers,
				invites: org.invites ?? [],
			});
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const POST = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/members" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id } = await context.params;
			await authorize(
				auth,
				"organizations:InviteMember",
				arn.org.organizations(id),
				{ req },
			);
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = inviteBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const result = await inviteMember({
				organizationId: id,
				invitedById: auth.userId,
				email: parsed.data.email,
				role: parsed.data.role,
			});
			if (!result) throw ErrInvalidAction;
			return ok(result, "Invitation sent");
		} catch (error) {
			return handleError(error);
		}
	}),
);
