import { Suspense } from "react";
import { NotificationsWrapper } from "@/libs";

export default function NotificationsPage() {
	return (
		<Suspense>
			<NotificationsWrapper />
		</Suspense>
	);
}
