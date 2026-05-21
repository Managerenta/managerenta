import mongoose from "mongoose";
import { ErrTenantNotFound } from "../../constants";
import { deleteTenantDB, getUnitsByIdsDB, setUnitVacantDB } from "../../models";
import { notifyTenantMoveOut } from "../notifications";
import { invalidateCacheKeys } from "./utils";

export default async function deleteTenant({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	const session = await mongoose.startSession();
	let removed: {
		tenantName: string;
		unitId: string;
	} | null = null;
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
		removed = { tenantName: deleted.name, unitId: deleted.unitId };
	} catch (err) {
		if (session.inTransaction()) await session.abortTransaction();
		throw err;
	} finally {
		await session.endSession();
	}

	if (removed) {
		const [unitDoc] = await getUnitsByIdsDB({
			ids: [removed.unitId],
			userId,
		});
		void notifyTenantMoveOut({
			userId,
			tenantId: id,
			tenantName: removed.tenantName,
			unitName: unitDoc?.name,
		});
	}
}
