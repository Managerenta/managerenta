import { Suspense } from "react";
import { AdminOrganizationDetailWrapper } from "@/libs/AdminWrapper";

export default async function AdminOrganizationDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		<Suspense>
			<AdminOrganizationDetailWrapper id={id} />
		</Suspense>
	);
}
