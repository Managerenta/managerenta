import { getUnitsByPropertyIdDB } from "../../models";

export default async function getUnitsByProperty({
	propertyId,
	userId,
}: {
	propertyId: string;
	userId: string;
}) {
	return getUnitsByPropertyIdDB({ propertyId, userId });
}
