"use client";
import { memo, useMemo, useState } from "react";
import { Box } from "@/components";
import { usePropertiesNavigation } from "@/hooks";
import { Pagination } from "@/layouts";
import {
	PropertiesFilter,
	PropertiesGrid,
	PropertiesHeader,
	PropertyDetailWrapper,
} from "./components";
import { PropertiesWrapperStyled } from "./styled";

function PropertiesWrapper() {
	const [offset, setOffset] = useState<number>(0);
	const [pageSize] = useState<number>(12);
	const [totalItems] = useState<number>(24);

	const { isDetailView, selectedPropertyId } = usePropertiesNavigation();

	const totalPages = useMemo<number>(() => {
		return Math.ceil(totalItems / pageSize);
	}, [totalItems, pageSize]);

	if (isDetailView && selectedPropertyId) {
		return <PropertyDetailWrapper propertyId={selectedPropertyId} />;
	}

	return (
		<PropertiesWrapperStyled>
			<PropertiesHeader />
			<PropertiesFilter />
			<PropertiesGrid />

			<Box className="pagination-footer">
				<Box className="items-per-page">
					<span>Items per page:</span>
					<select defaultValue={pageSize}>
						<option value={6}>6</option>
						<option value={12}>12</option>
						<option value={24}>24</option>
					</select>
				</Box>

				<Pagination
					totalPages={totalPages}
					pageSize={pageSize}
					offset={offset}
					setOffset={setOffset}
				/>

				<Box className="showing-info">
					Showing {offset + 1}-
					{Math.min(offset + pageSize, totalItems)} of {totalItems}{" "}
					properties
				</Box>
			</Box>
		</PropertiesWrapperStyled>
	);
}

export default memo(PropertiesWrapper);
