import { getOrganizationsForMemberDB } from "../../models";

export default async function getMyOrganizations({
	userId,
}: {
	userId: string;
}) {
	return getOrganizationsForMemberDB({ userId });
}
