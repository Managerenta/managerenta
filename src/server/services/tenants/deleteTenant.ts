import mongoose from "mongoose";
import { ErrTenantNotFound } from "../../constants";
import { deleteTenantDB, setUnitVacantDB } from "../../models";
import { invalidateCacheKeys } from "./utils";

export default async function deleteTenant({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	const session = await mongoose.startSession();
	try {
		session.startTransaction();
		const deleted = await deleteTenantDB({ id, userId, session });
		if (!deleted) {
			await session.abortTransaction();
			throw ErrTenantNotFound;
		}

		await setUnitVacantDB({ id: deleted.unitId, session });

		await session.commitTransaction();
		await invalidateCacheKeys({ userId, id });
	} catch (err) {
		if (session.inTransaction()) await session.abortTransaction();
		throw err;
	} finally {
		await session.endSession();
	}
}
