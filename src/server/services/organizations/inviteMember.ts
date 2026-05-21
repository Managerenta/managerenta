import crypto from "node:crypto";
import mongoose from "mongoose";
import { hashToken } from "../../constants";
import {
	addOrganizationInviteDB,
	getOrganizationByIdDB,
	getUserByEmailDB,
} from "../../models";
import type { IOrganizationRole } from "../../models/organizations/types";
import { sendNotification } from "../notifications";
import { invalidateCacheKeys } from "./utils";

export default async function inviteMember({
	organizationId,
	invitedById,
	email,
	role,
}: {
	organizationId: string;
	invitedById: string;
	email: string;
	role: IOrganizationRole;
}) {
	const org = await getOrganizationByIdDB({ id: organizationId });
	if (!org) return null;

	const normalizedEmail = email.toLowerCase();

	const existingUser = await getUserByEmailDB({ email: normalizedEmail });
	if (existingUser) {
		const alreadyMember = org.members?.some(
			(m) => m.memberId.toString() === existingUser._id.toString(),
		);
		if (alreadyMember) return { alreadyMember: true };
	}

	const token = crypto.randomBytes(24).toString("hex");
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

	// SECURITY: store ONLY the hash on the org document — see
	// SECURITY_REVIEW.md H6. The raw token leaves the server in the email
	// link only. Look-ups (acceptInvite, revokeInvite) hash before query.
	const updated = await addOrganizationInviteDB({
		id: organizationId,
		invite: {
			email: normalizedEmail,
			token: hashToken(token),
			role,
			invitedById: new mongoose.Types.ObjectId(invitedById),
			expiresAt,
		},
	});
	if (!updated) return null;

	// Best-effort notification — addressed to the invited user (no userId yet
	// if they haven't signed up, so we use the inviter's userId on the
	// notification record so the inviter sees the dispatch).
	await sendNotification({
		userId: invitedById,
		organizationId,
		channels: ["email"],
		kind: "org-invite",
		title: `You've been invited to join ${org.name}`,
		body: `Open this link to accept: /invitations/accept?token=${token}`,
		to: normalizedEmail,
		// SECURITY: do not persist the raw token in `meta` — keep only the
		// safe references (role, organizationId). The body still carries the
		// link for the invitee; the token's authoritative location is the
		// invite record on the organization document.
		meta: { role, organizationId },
	});

	await invalidateCacheKeys({
		organizationId: updated.id.toString(),
		name: updated.name,
	});

	return { token, expiresAt, role, email: normalizedEmail };
}
