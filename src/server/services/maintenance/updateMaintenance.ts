import { updateMaintenanceRequestDB } from "../../models";
import type {
	IMaintenanceCategory,
	IMaintenancePriority,
	IMaintenanceStatus,
} from "../../models/maintenance/types";

export default async function updateMaintenance({
	id,
	userId,
	payload,
}: {
	id: string;
	userId: string;
	payload: {
		title?: string;
		description?: string;
		category?: IMaintenanceCategory;
		priority?: IMaintenancePriority;
		status?: IMaintenanceStatus;
		vendorId?: string;
		cost?: number;
		scheduledDate?: Date;
		completedDate?: Date;
	};
}) {
	const next = { ...payload };
	// When a request is marked completed without an explicit completion date,
	// stamp it now so reporting has an accurate close time.
	if (next.status === "completed" && !next.completedDate) {
		next.completedDate = new Date();
	}
	return updateMaintenanceRequestDB({ id, userId, payload: next });
}
