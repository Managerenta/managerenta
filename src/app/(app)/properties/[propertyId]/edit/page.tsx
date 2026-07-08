import { Suspense } from "react";
import EditPropertyWrapper from "@/libs/EditPropertyWrapper";

interface IProps {
	params: Promise<{ propertyId: string }>;
}

export default async function EditPropertyPage({ params }: IProps) {
	const { propertyId } = await params;
	return (
		<Suspense>
			<EditPropertyWrapper propertyId={propertyId} />
		</Suspense>
	);
}
