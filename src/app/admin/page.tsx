import { Suspense } from "react";
import { AdminOverviewWrapper } from "@/libs/AdminWrapper";

export default function AdminOverviewPage() {
	return (
		<Suspense>
			<AdminOverviewWrapper />
		</Suspense>
	);
}
