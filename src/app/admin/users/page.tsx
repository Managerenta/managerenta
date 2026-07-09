import { Suspense } from "react";
import { AdminUsersWrapper } from "@/libs/AdminWrapper";

export default function AdminUsersPage() {
	return (
		<Suspense>
			<AdminUsersWrapper />
		</Suspense>
	);
}
