import mongoose from "mongoose";
import { createUnitDB, incrementPropertyTotalUnitsDB } from "../../models";
import { invalidateCacheKeys } from "./utils";

export default async function addUnit({
	name,
	rent,
	propertyId,
	userId,
}: {
	name: string;
	rent: number;
	propertyId: string;
	userId: string;
}) {
	const session = await mongoose.startSession();
	try {
		session.startTransaction();
		const unit = await createUnitDB({
			payload: { name, rent, propertyId, userId },
			session,
		});
		if (!unit) {
			await session.abortTransaction();
			return null;
		}

		await incrementPropertyTotalUnitsDB({
			id: propertyId,
			userId,
			session,
		});

		await session.commitTransaction();
		await invalidateCacheKeys({ userId, propertyId });
		return unit;
	} catch (err) {
		if (session.inTransaction()) await session.abortTransaction();
		throw err;
	} finally {
		await session.endSession();
	}
}
