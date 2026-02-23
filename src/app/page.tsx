import { Suspense } from "react";
import { SignupWrapper } from "@/libs";

export default function Home() {
	return (
		<Suspense>
			<SignupWrapper />
		</Suspense>
	);
}
