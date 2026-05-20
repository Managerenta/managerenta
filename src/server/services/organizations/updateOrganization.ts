import { updateOrganizationDB } from "../../models";
import type { IOrganizationCreateInput } from "../../models/organizations/types";
import { invalidateCacheKeys } from "./utils";

export default async function updateOrganization({
	organizationId,
	payload,
}: {
	organizationId: string;
	payload: IOrganizationCreateInput;
}): Promise<ReturnType<typeof updateOrganizationDB>> {
	const result = await updateOrganizationDB({ id: organizationId, payload });
	if (!result) return null;

	await invalidateCacheKeys({
		organizationId: result.id.toString(),
		name: result.name,
	});
	return result;
}
