import { Suspense } from "react";
import { LoginWrapper } from "@/libs";

export default function Vault() {
	return (
		<Suspense>
			<LoginWrapper />
		</Suspense>
	);
}
