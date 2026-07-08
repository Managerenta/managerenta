import mongoose from "mongoose";
import { uploadAndResizeImage } from "../../helpers";
import { seedOrgOwnerAdmin } from "../../iam/seed/system-policies";
import { Organization } from "../../models";
import {
	type IOrganizationCreateInput,
	IOrganizationRole,
} from "../../models/organizations/types";
import { invalidateCacheKeys } from "./utils";

export default async function createOrganization({
	payload,
}: {
	payload: Omit<IOrganizationCreateInput, "logo"> & { logo?: Buffer };
}) {
	let uploadedLogo: string | undefined;
	if (payload.logo) {
		const result = await uploadAndResizeImage({
			basePath: "organizations/logo",
			bufferOrUrl: payload.logo,
			shouldResize: true,
		});
		uploadedLogo = result ?? undefined;
	}

	const doc = await Organization.create({
		ownerId: payload.ownerId,
		name: payload.name,
		description: payload.description,
		website: payload.website,
		x: payload.x,
		instagram: payload.instagram,
		telegram: payload.telegram,
		logo: uploadedLogo,
		members: [
			{
				memberId:
					payload.ownerId instanceof mongoose.Types.ObjectId
						? payload.ownerId
						: new mongoose.Types.ObjectId(
								payload.ownerId as string,
							),
				permission: IOrganizationRole.ADMIN,
			},
		],
		invites: [],
	});

	// Seed this org's IAM system groups (OrgAdmin/Manager/Viewer) and auto-join
	// the owner to OrgAdmin, so the org is IAM-ready from creation. Best-effort:
	// IAM seeding must never block org creation — the `iam:migrate` backfill
	// reconciles any org that missed this step.
	try {
		await seedOrgOwnerAdmin(doc._id.toString(), doc.ownerId.toString());
	} catch {
		// swallow — org creation succeeds regardless of IAM seeding
	}

	await invalidateCacheKeys({
		organizationId: doc._id.toString(),
		name: doc.name,
	});
	return doc;
}
