import { Suspense } from "react";
import { VendorsWrapper } from "@/libs";

export default function VendorsPage() {
	return (
		<Suspense>
			<VendorsWrapper />
		</Suspense>
	);
}
