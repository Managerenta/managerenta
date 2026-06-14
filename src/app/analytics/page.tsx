import { Suspense } from "react";
import { AnalyticsWrapper } from "@/libs";

export default function AnalyticsPage() {
	return (
		<Suspense>
			<AnalyticsWrapper />
		</Suspense>
	);
}
