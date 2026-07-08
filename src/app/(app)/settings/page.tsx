import { Suspense } from "react";
import { SettingsWrapper } from "@/libs";

export default function Settings() {
	return (
		<Suspense>
			<SettingsWrapper />
		</Suspense>
	);
}
