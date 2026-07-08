import { redisDeleteKeys } from "../../databases";
import { setOrganizationDeletedDB } from "../../models";

// Operator suspend/reactivate. Suspension flips the org's `deleted` flag, which
// removes it from every tenant-facing org query; reactivation restores it.
// Behind a platform-plane authorize().

export default async function setOrganizationSuspended({
	orgId,
	suspended,
}: {
	orgId: string;
	suspended: boolean;
}): Promise<{ id: string; suspended: boolean } | null> {
	const result = await setOrganizationDeletedDB({
		id: orgId,
		deleted: suspended,
	});
	if (!result) return null;
	// Bust the platform overview cache so counts reflect the change immediately.
	await redisDeleteKeys("services:platform:*");
	return { id: orgId, suspended };
}
