import { Suspense } from "react";
import { PortalWrapper } from "@/libs";

export default async function PortalPage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	return (
		<Suspense>
			<PortalWrapper token={token} />
		</Suspense>
	);
}
