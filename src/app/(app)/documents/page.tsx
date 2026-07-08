import { Suspense } from "react";
import { DocumentsWrapper } from "@/libs";

export default function DocumentsPage() {
	return (
		<Suspense>
			<DocumentsWrapper />
		</Suspense>
	);
}
