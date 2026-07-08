import mongoose from "mongoose";
import { hashToken } from "../../constants";
import { syncOrgMemberRole } from "../../iam/sync";
import {
	consumeInviteAndAddMemberDB,
	findOrganizationByInviteTokenDB,
	updateUserRawDB,
} from "../../models";
import type { IOrganizationRole } from "../../models/organizations/types";
import getUserById from "../users/getUserById";
import { invalidateCacheKeys as invalidateUserCache } from "../users/utils";
import { invalidateCacheKeys } from "./utils";

type DocWithId = {
	_id: { toString(): string };
	name?: string;
	invites?: { token: string; email: string; role?: IOrganizationRole }[];
};

export default async function acceptInvite({
	token,
	userId,
}: {
	token: string;
	userId: string;
}) {
	// The token from the URL is raw; the org document holds only its
	// hash — see SECURITY_REVIEW.md H6.
	const hashed = hashToken(token);
	const org = (await findOrganizationByInviteTokenDB({
		token: hashed,
	})) as unknown as DocWithId | null;
	if (!org) return null;

	// Invites are bound to the invited email: a leaked/forwarded link must
	// not let an arbitrary signed-in account join at the assigned role.
	const invite = org.invites?.find((i) => i.token === hashed);
	const user = await getUserById({ id: userId });
	if (
		!invite ||
		!user?.email ||
		invite.email.toLowerCase() !== user.email.toLowerCase()
	) {
		return null;
	}

	const orgIdStr = org._id?.toString() ?? "";
	const updated = (await consumeInviteAndAddMemberDB({
		orgId: orgIdStr,
		token: hashed,
		memberId: new mongoose.Types.ObjectId(userId),
	})) as unknown as DocWithId | null;
	if (!updated) return null;

	await updateUserRawDB({
		id: userId,
		update: {
			$set: { currentOrganizationId: updated._id.toString() },
		},
	});

	// Mirror the new membership into IAM at the invited role so authorization
	// resolves correctly on the member's first request. Best-effort.
	await syncOrgMemberRole({
		orgId: updated._id.toString(),
		userId,
		role: (invite.role ?? "viewer") as "admin" | "manager" | "viewer",
	});

	await invalidateUserCache({ id: userId });
	await invalidateCacheKeys({
		organizationId: updated._id.toString(),
		name: updated.name ?? "",
	});
	return updated as DocWithId & { name: string };
}
