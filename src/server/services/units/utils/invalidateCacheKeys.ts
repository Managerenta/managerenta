import { redisDeleteKeys } from "../../../databases";
import { invalidateCacheKeys as invalidatePropertiesCacheKeys } from "../../properties/utils";
import { getQueryKey as getQueryKeyVacantUnits } from "../getVacantUnits";

export default async function invalidateCacheKeys({
	userId,
	propertyId,
}: {
	userId: string;
	propertyId?: string;
}): Promise<void> {
	await Promise.all([
		redisDeleteKeys(
			getQueryKeyVacantUnits({ userId, status: "*", limit: "*" }),
		),
		invalidatePropertiesCacheKeys({ userId, id: propertyId }),
	]);
}
