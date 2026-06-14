import { ErrPropertyNotFound } from "../../constants";
import { createMaintenanceRequestDB, getPropertyByIdDB } from "../../models";
import type {
	IMaintenanceCategory,
	IMaintenancePriority,
} from "../../models/maintenance/types";

export default async function createMaintenance({
	userId,
	propertyId,
	unitId,
	tenantId,
	vendorId,
	title,
	description,
	category,
	priority,
	cost,
	scheduledDate,
}: {
	userId: string;
	propertyId: string;
	unitId?: string;
	tenantId?: string;
	vendorId?: string;
	title: string;
	description: string;
	category: IMaintenanceCategory;
	priority?: IMaintenancePriority;
	cost?: number;
	scheduledDate?: Date;
}) {
	const property = await getPropertyByIdDB({ id: propertyId, userId });
	if (!property) throw ErrPropertyNotFound;

	return createMaintenanceRequestDB({
		payload: {
			userId,
			propertyId,
			unitId,
			tenantId,
			vendorId,
			title,
			description,
			category,
			priority,
			cost,
			scheduledDate,
		},
	});
}
