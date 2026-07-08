import { Organization } from "../../models/organizations";
import type { IOrganization } from "../../models/organizations/types";
import { addMembershipDB } from "../models";
import { groupForRole, seedOrgSystemGroups } from "../seed/system-policies";

export interface MigrationReport {
	organizations: number;
	owners: number;
	members: number;
	skipped: number;
	dryRun: boolean;
}

/**
 * One-time data migration: read every organization's `members.permission` and
 * create the matching `IamGroupMembership` into that org's seeded
 * OrgAdmin/Manager/Viewer group, plus auto-join the owner to OrgAdmin. Preserves
 * effective access exactly (the seeded policies reproduce the old role
 * semantics). Idempotent — memberships upsert, so re-running is safe.
 *
 * `dryRun` reports what WOULD be written without touching the group/membership
 * collections (used to validate the migration before committing).
 */
export async function migrateRolesToIam({
	dryRun = false,
}: {
	dryRun?: boolean;
} = {}): Promise<MigrationReport> {
	const report: MigrationReport = {
		organizations: 0,
		owners: 0,
		members: 0,
		skipped: 0,
		dryRun,
	};

	const orgs = (await Organization.find({ deleted: false })
		.select("ownerId members")
		.lean()
		.exec()) as unknown as Array<{
		_id: { toString(): string };
		ownerId: { toString(): string };
		members?: IOrganization["members"];
	}>;

	for (const org of orgs) {
		const orgId = org._id.toString();
		report.organizations += 1;

		if (dryRun) {
			report.owners += 1;
			report.members += (org.members ?? []).length;
			continue;
		}

		const groups = await seedOrgSystemGroups(orgId);
		if (!groups) {
			report.skipped += 1;
			continue;
		}

		// Owner → OrgAdmin.
		const ownerMembership = await addMembershipDB({
			payload: {
				groupId: groups.admin._id.toString(),
				principalType: "user",
				principalId: org.ownerId.toString(),
				orgId,
			},
		});
		if (ownerMembership) report.owners += 1;

		// Each member → the group matching their old role.
		for (const member of org.members ?? []) {
			const group = groupForRole(member.permission, groups);
			const membership = await addMembershipDB({
				payload: {
					groupId: group._id.toString(),
					principalType: "user",
					principalId: member.memberId.toString(),
					orgId,
				},
			});
			if (membership) report.members += 1;
			else report.skipped += 1;
		}
	}

	return report;
}
