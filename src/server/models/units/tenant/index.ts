import mongoose from "mongoose";
import { s3GetFileLink } from "../../../helpers";
import type { IUnitTenant, IUnitTenantPopulated } from "./types";

export const tenantSubSchema = new mongoose.Schema<IUnitTenant>(
	{
		tenantId: { type: String, required: true },
		name: { type: String, required: true },
		avatar: { type: String, required: false },
	},
	{ _id: false },
);

export async function resolveTenant(
	tenant: IUnitTenant | null | undefined,
): Promise<IUnitTenantPopulated | null> {
	if (!tenant) return null;

	let rawAvatar = tenant.avatar ?? null;

	if (!rawAvatar) {
		const TenantModel = mongoose.models.tenants;
		if (TenantModel) {
			const docs = await TenantModel.aggregate([
				{
					$match: {
						_id: new mongoose.Types.ObjectId(tenant.tenantId),
					},
				},
				{ $project: { avatar: 1 } },
				{ $limit: 1 },
			]);
			rawAvatar = docs[0]?.avatar ?? null;
		}
	}

	const avatar = rawAvatar
		? ((await s3GetFileLink({ fileName: rawAvatar })) ?? rawAvatar)
		: null;

	return { _id: tenant.tenantId, name: tenant.name, avatar };
}

export * from "./types";
