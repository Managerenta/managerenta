import { Suspense } from "react";
import { AdminIamWrapper } from "@/libs/AdminWrapper";

export default function AdminIamPage() {
	return (
		<Suspense>
			<AdminIamWrapper />
		</Suspense>
	);
}
