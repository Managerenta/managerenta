import { Suspense } from "react";
import { CalendarWrapper } from "@/libs";

export default function CalendarPage() {
	return (
		<Suspense>
			<CalendarWrapper />
		</Suspense>
	);
}
