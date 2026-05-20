import { ErrTryAgain } from "../../constants";
import { uploadAndResizeImage } from "../../helpers";
import { createOrganizationDB } from "../../models";
import type { IOrganizationCreateInput } from "../../models/organizations/types";
import { invalidateCacheKeys } from "./utils";

export default async function createOrganization({
	payload,
}: {
	payload: Omit<IOrganizationCreateInput, "logo"> & { logo: Buffer };
}): Promise<ReturnType<typeof createOrganizationDB>> {
	const uploadedLogo = await uploadAndResizeImage({
		basePath: "organizations/logo",
		bufferOrUrl: payload.logo,
		shouldResize: true,
	});

	if (!uploadedLogo) throw ErrTryAgain;

	const result = await createOrganizationDB({
		payload: { ...payload, logo: uploadedLogo },
	});
	if (!result) return null;

	await invalidateCacheKeys({
		organizationId: result.id.toString(),
		name: result.name,
	});
	return result;
}
