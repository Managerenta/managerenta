import { Suspense } from "react";
import { AdminAnalyticsWrapper } from "@/libs/AdminWrapper";

export default function AdminAnalyticsPage() {
	return (
		<Suspense>
			<AdminAnalyticsWrapper />
		</Suspense>
	);
}
