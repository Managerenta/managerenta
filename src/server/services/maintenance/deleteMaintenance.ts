import { deleteMaintenanceRequestDB } from "../../models";

export default async function deleteMaintenance({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	return deleteMaintenanceRequestDB({ id, userId });
}
