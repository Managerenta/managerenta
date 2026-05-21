import mongoose from "mongoose";
import { hashToken } from "../../constants";
import {
	consumeInviteAndAddMemberDB,
	findOrganizationByInviteTokenDB,
	updateUserRawDB,
} from "../../models";
import { invalidateCacheKeys as invalidateUserCache } from "../users/utils";
import { invalidateCacheKeys } from "./utils";

type DocWithId = {
	_id: { toString(): string };
	name?: string;
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

	await invalidateUserCache({ id: userId });
	await invalidateCacheKeys({
		organizationId: updated._id.toString(),
		name: updated.name ?? "",
	});
	return updated as DocWithId & { name: string };
}
