import mongoose from "mongoose";
import { getUsersByIdsDB, Organization } from "../../models";
import type { IOrganizationRole } from "../../models/organizations/types";

// Full operator view of a single org: profile, owner, enriched members, and the
// owner-scoped portfolio stats. Behind a platform-plane authorize().

export interface PlatformOrgMember {
	memberId: string;
	permission: IOrganizationRole | "owner";
	name: string;
	email: string;
}

export interface PlatformOrgDetail {
	id: string;
	name: string;
	description: string;
	suspended: boolean;
	createdAt: Date;
	owner: { id: string; name: string; email: string } | null;
	members: PlatformOrgMember[];
	stats: {
		properties: number;
		units: number;
		occupiedUnits: number;
		tenants: number;
		revenue: number;
	};
}

async function count(
	collection: string,
	filter: Record<string, unknown>,
): Promise<number> {
	const model = mongoose.models[collection];
	if (!model) return 0;
	try {
		return await model.countDocuments(filter);
	} catch {
		return 0;
	}
}

async function revenueForOwner(ownerId: string): Promise<number> {
	const model = mongoose.models.transactions;
	if (!model) return 0;
	try {
		const rows = await model.aggregate<{ total: number }>([
			{ $match: { userId: ownerId, amountType: "credit" } },
			{ $group: { _id: null, total: { $sum: "$amount" } } },
		]);
		return Math.round(rows[0]?.total ?? 0);
	} catch {
		return 0;
	}
}

export default async function getPlatformOrganizationDetail({
	orgId,
}: {
	orgId: string;
}): Promise<PlatformOrgDetail | null> {
	type OrgLean = {
		_id: mongoose.Types.ObjectId;
		name: string;
		description?: string;
		ownerId: mongoose.Types.ObjectId;
		members?: {
			memberId: mongoose.Types.ObjectId;
			permission: IOrganizationRole;
		}[];
		deleted?: boolean;
		createdAt: Date;
	};
	let doc: OrgLean | null;
	try {
		doc = await Organization.findById(new mongoose.Types.ObjectId(orgId))
			.select("+deleted name description ownerId members createdAt")
			.lean<OrgLean>();
	} catch {
		return null;
	}
	if (!doc) return null;

	const ownerId = doc.ownerId.toString();
	const memberIds = (doc.members ?? []).map((m) => m.memberId.toString());
	const allIds = Array.from(new Set([ownerId, ...memberIds]));
	const users = allIds.length
		? await getUsersByIdsDB({
				ids: allIds,
				limit: allIds.length,
				offset: 0,
			})
		: [];
	const userMap = new Map(users.map((u) => [u._id.toString(), u]));

	const [properties, units, occupiedUnits, tenants, revenue] =
		await Promise.all([
			count("properties", { userId: ownerId, deleted: false }),
			count("units", { userId: ownerId, deleted: false }),
			count("units", {
				userId: ownerId,
				deleted: false,
				status: "Occupied",
			}),
			count("tenants", { userId: ownerId, deleted: false }),
			revenueForOwner(ownerId),
		]);

	const ownerUser = userMap.get(ownerId);
	const members: PlatformOrgMember[] = (doc.members ?? []).map((m) => {
		const u = userMap.get(m.memberId.toString());
		return {
			memberId: m.memberId.toString(),
			permission: m.permission,
			name: u?.name ?? "",
			email: u?.email ?? "",
		};
	});

	return {
		id: doc._id.toString(),
		name: doc.name,
		description: doc.description ?? "",
		suspended: Boolean(doc.deleted),
		createdAt: doc.createdAt,
		owner: ownerUser
			? {
					id: ownerId,
					name: ownerUser.name ?? "",
					email: ownerUser.email ?? "",
				}
			: null,
		members,
		stats: { properties, units, occupiedUnits, tenants, revenue },
	};
}
