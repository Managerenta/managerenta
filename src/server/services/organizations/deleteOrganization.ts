import { deleteOrganizationDB } from "../../models";
import { invalidateCacheKeys } from "./utils";

export default async function deleteOrganization({
	organizationId,
}: {
	organizationId: string;
}): Promise<ReturnType<typeof deleteOrganizationDB>> {
	const result = await deleteOrganizationDB({ id: organizationId });
	if (!result) return null;

	await invalidateCacheKeys({
		organizationId: result.id.toString(),
		name: result.name,
	});
	return result;
}
