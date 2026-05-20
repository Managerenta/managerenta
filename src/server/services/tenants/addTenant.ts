import mongoose from "mongoose";
import { ErrUnitNotFound } from "../../constants";
import { uploadAndResizeImage } from "../../helpers";
import {
	createTenantDB,
	getUnitsByIdsDB,
	setUnitOccupiedDB,
} from "../../models";
import { invalidateCacheKeys } from "./utils";

export default async function addTenant({
	name,
	phone,
	email,
	unitId,
	userId,
	moveInDate,
	leaseExpiry,
	rentDueDay,
	avatar,
}: {
	name: string;
	phone: string;
	email: string;
	unitId: string;
	userId: string;
	moveInDate: Date;
	leaseExpiry?: Date;
	rentDueDay?: number;
	avatar?: Buffer;
}) {
	const [unitDoc] = await getUnitsByIdsDB({ ids: [unitId], userId });
	if (!unitDoc) throw ErrUnitNotFound;

	const propertyId = unitDoc.propertyId;

	let uploadedAvatar: string | undefined;
	if (avatar) {
		uploadedAvatar =
			(await uploadAndResizeImage({
				basePath: "tenants/avatars",
				bufferOrUrl: avatar,
				shouldResize: true,
			})) ?? undefined;
	}

	const session = await mongoose.startSession();
	try {
		session.startTransaction();
		const tenant = await createTenantDB({
			payload: {
				name,
				phone,
				email,
				unitId,
				propertyId,
				userId,
				moveInDate,
				leaseExpiry,
				rentDueDay,
				...(uploadedAvatar ? { avatar: uploadedAvatar } : {}),
			},
			session,
		});
		if (!tenant) {
			await session.abortTransaction();
			throw ErrUnitNotFound;
		}

		await setUnitOccupiedDB({
			id: unitId,
			tenant: {
				tenantId: tenant.id,
				name: tenant.name,
				...(uploadedAvatar ? { avatar: uploadedAvatar } : {}),
			},
			session,
		});

		await session.commitTransaction();
		await invalidateCacheKeys({ userId });
		return tenant;
	} catch (err) {
		if (session.inTransaction()) await session.abortTransaction();
		throw err;
	} finally {
		await session.endSession();
	}
}
