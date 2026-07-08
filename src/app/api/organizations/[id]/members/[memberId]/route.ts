import { z as zod } from "zod";
import {
	ErrCannotRemoveOwner,
	ErrInvalidAction,
	ErrInvalidFields,
	ErrMustKeepOneAdmin,
	ErrResourceNotFound,
} from "@/server/constants";
import { arn, authorize } from "@/server/iam";
import { syncOrgMemberRemoved, syncOrgMemberRole } from "@/server/iam/sync";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { removeMemberDB, setMemberRoleDB } from "@/server/models";
import { IOrganizationRole } from "@/server/models/organizations/types";
import { getOrganizationById } from "@/server/services";
import { invalidateCacheKeys as invalidateOrgCache } from "@/server/services/organizations/utils";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; memberId: string }> };

const patchBodySchema = zod
	.object({
		role: zod.enum([
			IOrganizationRole.ADMIN,
			IOrganizationRole.MANAGER,
			IOrganizationRole.VIEWER,
		]),
	})
	.strict();

// SECURITY: an org admin can otherwise demote / kick the owner, or demote
// the last remaining admin and lock the org out of admin operations.
// Both invariants are enforced here. See SECURITY_REVIEW.md S6 / S7.
async function assertOwnerInvariants({
	organizationId,
	memberId,
	nextRole,
}: {
	organizationId: string;
	memberId: string;
	nextRole: IOrganizationRole | null;
}): Promise<void> {
	// Bypass Redis: an authorization decision can never run against stale
	// membership data (the cache is invalidated AFTER the write so two
	// concurrent admin-demotion requests could both see the pre-write state
	// and both succeed if we trusted the cache).
	const org = await getOrganizationById({
		organizationId,
		refreshCache: true,
	});
	if (!org) throw ErrResourceNotFound;

	if (org.ownerId?.toString() === memberId) throw ErrCannotRemoveOwner;

	// Removal (nextRole === null) and demotion-from-admin both shrink the
	// admin set. Refuse if the target is currently the only admin.
	const target = org.members?.find((m) => m.memberId.toString() === memberId);
	if (!target) throw ErrInvalidAction;

	const isAdminRemoval =
		target.permission === IOrganizationRole.ADMIN &&
		nextRole !== IOrganizationRole.ADMIN;
	if (!isAdminRemoval) return;

	const adminCount = (org.members ?? []).filter(
		(m) => m.permission === IOrganizationRole.ADMIN,
	).length;
	if (adminCount <= 1) throw ErrMustKeepOneAdmin;
}

export const PATCH = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/members/[memberId]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id, memberId } = await context.params;
			await authorize(
				auth,
				"organizations:Update",
				arn.org.organizations(id, memberId),
				{ req },
			);
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = patchBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			await assertOwnerInvariants({
				organizationId: id,
				memberId,
				nextRole: parsed.data.role,
			});

			const result = await setMemberRoleDB({
				orgId: id,
				memberId,
				role: parsed.data.role,
			});
			if (!result) throw ErrInvalidAction;
			await invalidateOrgCache({ organizationId: id });
			// Keep IAM group membership in step with the new role.
			await syncOrgMemberRole({
				orgId: id,
				userId: memberId,
				role: parsed.data.role,
			});
			return ok(result, "Role updated");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler<RouteContext>(
	{ route: "/api/organizations/[id]/members/[memberId]" },
	withAuth<RouteContext>(async ({ req, auth, context }) => {
		try {
			const { id, memberId } = await context.params;
			await authorize(
				auth,
				"organizations:RemoveMember",
				arn.org.organizations(id, memberId),
				{ req },
			);
			await assertOwnerInvariants({
				organizationId: id,
				memberId,
				nextRole: null,
			});
			const result = await removeMemberDB({ orgId: id, memberId });
			if (!result) throw ErrInvalidAction;
			await invalidateOrgCache({ organizationId: id });
			// Drop all of the removed member's IAM group grants for this org.
			await syncOrgMemberRemoved({ orgId: id, userId: memberId });
			return ok(null, "Member removed");
		} catch (error) {
			return handleError(error);
		}
	}),
);
