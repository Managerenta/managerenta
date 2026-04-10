import { Suspense } from "react";
import AddTransactionWrapper from "@/libs/AddTransactionWrapper";

interface IProps {
	params: Promise<{ tenantId: string }>;
}

export default async function AddTransactionPage({ params }: IProps) {
	const { tenantId } = await params;
	return (
		<Suspense>
			<AddTransactionWrapper tenantId={tenantId} />
		</Suspense>
	);
}
