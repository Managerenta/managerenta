import { removeOrganizationMembersDB } from "../../models";
import { invalidateCacheKeys } from "./utils";

export default async function removeOrganizationMembers({
	organizationId,
	memberId,
}: {
	organizationId: string;
	memberId: string;
}): Promise<ReturnType<typeof removeOrganizationMembersDB>> {
	const result = await removeOrganizationMembersDB({
		id: organizationId,
		memberId,
	});
	if (!result) return null;

	await invalidateCacheKeys({
		organizationId: result.id.toString(),
		name: result.name,
	});
	return result;
}
