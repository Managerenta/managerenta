import { getUnitByIdDB } from "../../models";

export default async function getUnit({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	return getUnitByIdDB({ id, userId });
}
