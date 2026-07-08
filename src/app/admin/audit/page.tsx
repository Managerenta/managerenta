import { Suspense } from "react";
import { AdminAuditWrapper } from "@/libs/AdminWrapper";

export default function AdminAuditPage() {
	return (
		<Suspense>
			<AdminAuditWrapper />
		</Suspense>
	);
}
