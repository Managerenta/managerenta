import { getUnitByIdDB, updateUnitDB } from "../../models";
import { invalidateCacheKeys } from "./utils";

export default async function updateUnit({
	id,
	userId,
	payload,
}: {
	id: string;
	userId: string;
	payload: { name?: string; rent?: number };
}) {
	const existing = await getUnitByIdDB({ id, userId });
	if (!existing) return null;

	const result = await updateUnitDB({ id, userId, payload });
	if (result) {
		await invalidateCacheKeys({ userId, propertyId: existing.propertyId });
	}
	return result;
}
