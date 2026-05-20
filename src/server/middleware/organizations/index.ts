import "server-only";
import { ErrUnauthorized } from "../../constants";
import { IOrganizationRole } from "../../models/organizations/types";
import { getOrganizationMembers } from "../../services";

async function verifyUserOrganizationPermission({
	userId,
	organizationId,
	permissions,
}: {
	userId: string;
	organizationId: string;
	permissions: string[];
}): Promise<boolean> {
	const result = await getOrganizationMembers({ organizationId });
	const memberRole = result?.members?.find(
		(member) => member.memberId.toString() === userId,
	)?.permission;

	if (!memberRole) return false;

	if (
		!permissions
			.map((permission) => permission.toLowerCase())
			.includes(memberRole)
	)
		return false;
	return true;
}

export async function assertOrganizationAdmin({
	userId,
	organizationId,
}: {
	userId: string;
	organizationId: string;
}): Promise<void> {
	const ok = await verifyUserOrganizationPermission({
		userId,
		organizationId,
		permissions: [IOrganizationRole.ADMIN],
	});
	if (!ok) throw ErrUnauthorized;
}

export async function assertOrganizationAdminOrManager({
	userId,
	organizationId,
}: {
	userId: string;
	organizationId: string;
}): Promise<void> {
	const ok = await verifyUserOrganizationPermission({
		userId,
		organizationId,
		permissions: [IOrganizationRole.ADMIN, IOrganizationRole.MANAGER],
	});
	if (!ok) throw ErrUnauthorized;
}
