import {
	createVendorDB,
	deleteVendorDB,
	getVendorByIdDB,
	getVendorsDB,
	updateVendorDB,
} from "../../models";
import type {
	IVendorCreateInput,
	IVendorSpecialty,
} from "../../models/vendors/types";

export async function createVendor({
	userId,
	...rest
}: {
	userId: string;
	name: string;
	company?: string;
	specialty: IVendorSpecialty;
	phone?: string;
	email?: string;
	address?: string;
	notes?: string;
	rating?: number;
}) {
	return createVendorDB({ payload: { userId, ...rest } });
}

export async function getVendors({
	userId,
	limit,
	offset,
	specialty,
	search,
}: {
	userId: string;
	limit?: number;
	offset?: number;
	specialty?: string;
	search?: string;
}) {
	return getVendorsDB({ userId, limit, offset, specialty, search });
}

export async function getVendorById({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	return getVendorByIdDB({ id, userId });
}

export async function updateVendor({
	id,
	userId,
	payload,
}: {
	id: string;
	userId: string;
	payload: Partial<IVendorCreateInput>;
}) {
	return updateVendorDB({ id, userId, payload });
}

export async function deleteVendor({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	return deleteVendorDB({ id, userId });
}
