import { getMaintenanceRequestByIdDB } from "../../models";

export default async function getMaintenanceById({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	return getMaintenanceRequestByIdDB({ id, userId });
}
