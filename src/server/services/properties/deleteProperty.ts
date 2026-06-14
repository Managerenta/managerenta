import mongoose from "mongoose";
import { ErrPropertyNotFound } from "../../constants";
import {
	deletePropertyDB,
	softDeleteTenantsByPropertyDB,
	softDeleteUnitsByPropertyDB,
} from "../../models";
import { invalidateCacheKeys as invalidateTenantCacheKeys } from "../tenants/utils";
import { invalidateCacheKeys } from "./utils";

/**
 * Soft-delete a property and cascade the soft-delete to all of its units and
 * tenants in a single transaction, so a removed property never leaves orphaned
 * occupied units or active tenants behind.
 */
export default async function deleteProperty({
	id,
	userId,
}: {
	id: string;
	userId: string;
}): Promise<{ units: number; tenants: number }> {
	const session = await mongoose.startSession();
	try {
		session.startTransaction();

		const deleted = await deletePropertyDB({ id, userId, session });
		if (!deleted) {
			await session.abortTransaction();
			throw ErrPropertyNotFound;
		}

		const [units, tenants] = await Promise.all([
			softDeleteUnitsByPropertyDB({ propertyId: id, userId, session }),
			softDeleteTenantsByPropertyDB({ propertyId: id, userId, session }),
		]);

		await session.commitTransaction();

		await Promise.all([
			invalidateCacheKeys({ userId, id }),
			invalidateTenantCacheKeys({ userId }),
		]);

		return { units, tenants };
	} catch (err) {
		if (session.inTransaction()) await session.abortTransaction();
		throw err;
	} finally {
		await session.endSession();
	}
}
