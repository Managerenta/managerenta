import { Suspense } from "react";
import EditTenantWrapper from "@/libs/EditTenantWrapper";

interface IProps {
	params: Promise<{ tenantId: string }>;
}

export default async function EditTenantPage({ params }: IProps) {
	const { tenantId } = await params;
	return (
		<Suspense>
			<EditTenantWrapper tenantId={tenantId} />
		</Suspense>
	);
}
