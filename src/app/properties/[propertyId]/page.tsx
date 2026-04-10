import { Suspense } from "react";
import PropertyDetailWrapper from "@/libs/PropertiesWrapper/components/PropertyDetailWrapper";

interface IProps {
	params: Promise<{ propertyId: string }>;
}

export default async function PropertyDetailPage({ params }: IProps) {
	const { propertyId } = await params;
	return (
		<Suspense>
			<PropertyDetailWrapper propertyId={propertyId} />
		</Suspense>
	);
}
