import { Suspense } from "react";
import TenantDetailWrapper from "@/libs/TenantsWrapper/components/TenantDetailWrapper";

interface IProps {
	params: Promise<{ tenantId: string }>;
}

export default async function TenantDetailPage({ params }: IProps) {
	const { tenantId } = await params;
	return (
		<Suspense>
			<TenantDetailWrapper tenantId={tenantId} />
		</Suspense>
	);
}
