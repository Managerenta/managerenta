import { Suspense } from "react";
import { AdminOrganizationsWrapper } from "@/libs/AdminWrapper";

export default function AdminOrganizationsPage() {
	return (
		<Suspense>
			<AdminOrganizationsWrapper />
		</Suspense>
	);
}
