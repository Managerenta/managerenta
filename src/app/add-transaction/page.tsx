import { Suspense } from "react";
import { AddTransactionWrapper } from "@/libs";

export default function AddTransaction() {
	return (
		<Suspense>
			<AddTransactionWrapper />
		</Suspense>
	);
}
