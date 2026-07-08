import { Suspense } from "react";
import { PropertiesWrapper } from "@/libs";

export default function Dashboard() {
	return (
		<Suspense>
			<PropertiesWrapper />
		</Suspense>
	);
}
