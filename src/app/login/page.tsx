import { Suspense } from "react";
import { LoginWrapper } from "@/libs";

export default function Login() {
	return (
		<Suspense>
			<LoginWrapper />
		</Suspense>
	);
}
