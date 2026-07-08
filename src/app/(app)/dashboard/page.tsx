import { Suspense } from "react";
import { DashboardWrapper } from "@/libs";

export default function Dashboard() {
	return (
		<Suspense>
			<DashboardWrapper />
		</Suspense>
	);
}
