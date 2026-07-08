import mongoose from "mongoose";
import { MAX_LIMIT } from "../../constants";
import { getUsersByIdsDB, Organization } from "../../models";

// Operator-facing org directory. Uses `.find()` (not the org aggregate helpers)
// so SUSPENDED orgs (`deleted: true`) remain visible for reactivation, and reads
// `deleted` explicitly (it is `select: false` on the schema).

export interface PlatformOrgRow {
	id: string;
	name: string;
	description: string;
	suspended: boolean;
	createdAt: Date;
	owner: { id: string; name: string; email: string } | null;
	memberCount: number;
	propertyCount: number;
	tenantCount: number;
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function countsByOwner(
	collection: string,
	ownerIds: string[],
): Promise<Map<string, number>> {
	const out = new Map<string, number>();
	const model = mongoose.models[collection];
	if (!model || ownerIds.length === 0) return out;
	try {
		const rows = await model.aggregate<{ _id: string; count: number }>([
			{ $match: { userId: { $in: ownerIds }, deleted: false } },
			{ $group: { _id: "$userId", count: { $sum: 1 } } },
		]);
		for (const r of rows) out.set(String(r._id), r.count);
	} catch {
		// leave empty on failure
	}
	return out;
}

export default async function getPlatformOrganizations({
	search = "",
	offset = 0,
	limit = 20,
}: {
	search?: string;
	offset?: number;
	limit?: number;
}): Promise<{ organizations: PlatformOrgRow[]; total: number }> {
	const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
	const filter: Record<string, unknown> = {};
	if (search.trim()) {
		filter.name = { $regex: escapeRegex(search.trim()), $options: "i" };
	}

	type OrgLean = {
		_id: mongoose.Types.ObjectId;
		name: string;
		description?: string;
		ownerId: mongoose.Types.ObjectId;
		members?: { memberId: mongoose.Types.ObjectId }[];
		deleted?: boolean;
		createdAt: Date;
	};
	let docs: OrgLean[] = [];
	let total = 0;
	try {
		[docs, total] = await Promise.all([
			Organization.find(filter)
				.select("+deleted name description ownerId members createdAt")
				.sort({ createdAt: -1 })
				.skip(Math.max(offset, 0))
				.limit(safeLimit)
				.lean<OrgLean[]>(),
			Organization.countDocuments(filter),
		]);
	} catch {
		return { organizations: [], total: 0 };
	}

	const ownerIds = Array.from(new Set(docs.map((d) => d.ownerId.toString())));
	const [users, propertyCounts, tenantCounts] = await Promise.all([
		ownerIds.length
			? getUsersByIdsDB({
					ids: ownerIds,
					limit: ownerIds.length,
					offset: 0,
				})
			: Promise.resolve([]),
		countsByOwner("properties", ownerIds),
		countsByOwner("tenants", ownerIds),
	]);
	const userMap = new Map(users.map((u) => [u._id.toString(), u]));

	const organizations: PlatformOrgRow[] = docs.map((d) => {
		const ownerId = d.ownerId.toString();
		const owner = userMap.get(ownerId);
		return {
			id: d._id.toString(),
			name: d.name,
			description: d.description ?? "",
			suspended: Boolean(d.deleted),
			createdAt: d.createdAt,
			owner: owner
				? {
						id: ownerId,
						name: owner.name ?? "",
						email: owner.email ?? "",
					}
				: null,
			memberCount: (d.members?.length ?? 0) + 1,
			propertyCount: propertyCounts.get(ownerId) ?? 0,
			tenantCount: tenantCounts.get(ownerId) ?? 0,
		};
	});

	return { organizations, total };
}
