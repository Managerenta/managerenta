import { Suspense } from "react";
import { MaintenanceWrapper } from "@/libs";

export default function MaintenancePage() {
	return (
		<Suspense>
			<MaintenanceWrapper />
		</Suspense>
	);
}
