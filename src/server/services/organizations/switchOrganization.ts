import { getOrganizationByIdDB, updateUserRawDB } from "../../models";
import { invalidateCacheKeys as invalidateUserCache } from "../users/utils";

export default async function switchOrganization({
	userId,
	organizationId,
}: {
	userId: string;
	organizationId: string | null;
}) {
	if (organizationId) {
		const org = await getOrganizationByIdDB({ id: organizationId });
		if (!org) return null;
		const isMember =
			org.ownerId.toString() === userId ||
			org.members?.some((m) => m.memberId.toString() === userId);
		if (!isMember) return null;
	}
	const update = organizationId
		? { $set: { currentOrganizationId: organizationId } }
		: { $unset: { currentOrganizationId: 1 } };
	const result = await updateUserRawDB({ id: userId, update });
	if (!result) return null;
	await invalidateUserCache({ id: userId });
	return { organizationId };
}
