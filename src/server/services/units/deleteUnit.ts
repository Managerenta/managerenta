import mongoose from "mongoose";
import {
	decrementPropertyTotalUnitsDB,
	deleteTenantDB,
	deleteUnitDB,
	getUnitByIdDB,
} from "../../models";
import { invalidateCacheKeys as invalidateTenantCacheKeys } from "../tenants/utils";
import { invalidateCacheKeys } from "./utils";

/**
 * Soft-delete a unit. If the unit is occupied, its tenant is soft-deleted too,
 * and the parent property's `totalUnits` count is decremented. Runs in a
 * transaction so the unit/tenant/property stay consistent.
 */
export default async function deleteUnit({
	id,
	userId,
}: {
	id: string;
	userId: string;
}): Promise<{ propertyId: string } | null> {
	const existing = await getUnitByIdDB({ id, userId });
	if (!existing) return null;

	const session = await mongoose.startSession();
	try {
		session.startTransaction();

		const deleted = await deleteUnitDB({ id, userId, session });
		if (!deleted) {
			await session.abortTransaction();
			return null;
		}

		const tenantId = existing.tenant?._id;
		if (tenantId) {
			await deleteTenantDB({ id: tenantId, userId, session });
		}

		await decrementPropertyTotalUnitsDB({
			id: existing.propertyId,
			userId,
			session,
		});

		await session.commitTransaction();
	} catch (err) {
		if (session.inTransaction()) await session.abortTransaction();
		throw err;
	} finally {
		await session.endSession();
	}

	await Promise.all([
		invalidateCacheKeys({ userId, propertyId: existing.propertyId }),
		invalidateTenantCacheKeys({ userId }),
	]);

	return { propertyId: existing.propertyId };
}
