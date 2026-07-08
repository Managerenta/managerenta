import { Suspense } from "react";
import { TenantsWrapper } from "@/libs";

export default function Dashboard() {
	return (
		<Suspense>
			<TenantsWrapper />
		</Suspense>
	);
}
