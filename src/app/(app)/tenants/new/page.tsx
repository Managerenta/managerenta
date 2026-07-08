import { Suspense } from "react";
import AddTenantWrapper from "@/libs/AddTenantWrapper";

export default function AddTenantPage() {
	return (
		<Suspense>
			<AddTenantWrapper />
		</Suspense>
	);
}
