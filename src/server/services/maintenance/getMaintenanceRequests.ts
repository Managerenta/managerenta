import { getMaintenanceRequestsDB, getMaintenanceStatsDB } from "../../models";

export default async function getMaintenanceRequests({
	userId,
	limit,
	offset,
	status,
	priority,
	propertyId,
	search,
}: {
	userId: string;
	limit?: number;
	offset?: number;
	status?: string;
	priority?: string;
	propertyId?: string;
	search?: string;
}) {
	const [{ requests, total }, stats] = await Promise.all([
		getMaintenanceRequestsDB({
			userId,
			limit,
			offset,
			status,
			priority,
			propertyId,
			search,
		}),
		getMaintenanceStatsDB({ userId }),
	]);
	return { requests, total, stats };
}
