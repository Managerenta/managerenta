import { ErrPropertyNotFound } from "../../constants";
import {
	createUnitDB,
	getPropertyByIdDB,
	incrementPropertyTotalUnitsDB,
} from "../../models";
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
	const property = await getPropertyByIdDB({ id: propertyId, userId });
	if (!property) throw ErrPropertyNotFound;

	const unit = await createUnitDB({
		payload: { name, rent, propertyId, userId },
	});
	if (!unit) return null;

	await incrementPropertyTotalUnitsDB({ id: propertyId, userId });
	await invalidateCacheKeys({ userId, propertyId });
	return unit;
}
