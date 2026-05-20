import { updateOrganizationMembersDB } from "../../models";
import type { IOrganization } from "../../models/organizations/types";
import { invalidateCacheKeys } from "./utils";

export default async function updateOrganizationMembers({
	organizationId,
	members,
}: {
	organizationId: string;
	members: IOrganization["members"];
}): Promise<ReturnType<typeof updateOrganizationMembersDB>> {
	const result = await updateOrganizationMembersDB({
		id: organizationId,
		members,
	});
	if (!result) return null;

	await invalidateCacheKeys({
		organizationId: result.id.toString(),
		name: result.name,
	});
	return result;
}
