import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import {
	getPropertyByIdDB,
	getTenantIdsByPropertyIdDB,
	getUnitsByPropertyIdDB,
	sumRentCreditsByTenantIdsDB,
} from "../../models";
import type { IProperty } from "../../models/properties/types";
import { type IUnitPopulated, IUnitStatus } from "../../models/units/types";

type TopPayingTenant = {
	id: string;
	name: string;
	avatar: string | null;
	monthlyRent: number;
	unit: string;
};

type GetPropertyByIdResult = IProperty & {
	units: IUnitPopulated[];
	averageVacancyDays: number;
	rentCollectedThisYear: number;
	topPayingTenants: TopPayingTenant[];
};

export function getQueryKey({
	userId,
	id,
}: {
	userId: string;
	id: string;
}): string {
	return `services:properties:getPropertyById:${userId}:${id}`;
}

export default async function getPropertyById({
	id,
	userId,
	refreshCache,
}: {
	id: string;
	userId: string;
	refreshCache?: boolean;
}): Promise<GetPropertyByIdResult | null> {
	const query = getQueryKey({ userId, id });

	if (!refreshCache) {
		const cached =
			await redisRetrieveKeyString<GetPropertyByIdResult>(query);
		if (cached) return cached;
	}

	const property = await getPropertyByIdDB({ id, userId });
	if (!property) return null;

	const units = await getUnitsByPropertyIdDB({ propertyId: id, userId });

	const unitsWithVacancy = units.filter(
		(u) => u.vacantDays !== null && u.vacantDays !== undefined,
	);
	const averageVacancyDays =
		unitsWithVacancy.length > 0
			? Math.round(
					unitsWithVacancy.reduce(
						(sum, u) => sum + (u.vacantDays ?? 0),
						0,
					) / unitsWithVacancy.length,
				)
			: 0;

	const tenantIds = await getTenantIdsByPropertyIdDB({
		propertyId: id,
		userId,
	});
	const startOfYear = new Date(new Date().getFullYear(), 0, 1);
	const rentCollectedThisYear = await sumRentCreditsByTenantIdsDB({
		tenantIds,
		since: startOfYear,
	});

	const topPayingTenants: TopPayingTenant[] = units
		.filter((u) => u.status === IUnitStatus.Occupied && u.tenant)
		.sort((a, b) => b.rent - a.rent)
		.slice(0, 5)
		.map((u) => ({
			id: u.tenant?._id ?? "",
			name: u.tenant?.name ?? "",
			avatar: u.tenant?.avatar ?? null,
			monthlyRent: u.rent,
			unit: u.name,
		}));

	const result: GetPropertyByIdResult = {
		...property,
		units,
		averageVacancyDays,
		rentCollectedThisYear,
		topPayingTenants,
	};

	await redisUpdateKeyString<GetPropertyByIdResult>(
		query,
		result,
		true,
		10 * 60,
	);
	return result;
}
