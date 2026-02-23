"use client";
import { memo, useMemo, useState } from "react";
import { Box } from "@/components";
import { useTenantNavigation } from "@/hooks";
import { Pagination } from "@/layouts";
import {
	TenantDetailWrapper,
	TenantsFilter,
	TenantsGrid,
	TenantsHeader,
} from "./components";
import { TenantsWrapperStyled } from "./styled";

function TenantsWrapper() {
	const [offset, setOffset] = useState<number>(0);
	const [pageSize] = useState<number>(12);
	const [totalItems] = useState<number>(142);

	const { isTenantDetailView, selectedTenantId } = useTenantNavigation();

	const totalPages = useMemo<number>(() => {
		return Math.ceil(totalItems / pageSize);
	}, [totalItems, pageSize]);

	if (isTenantDetailView && selectedTenantId) {
		return <TenantDetailWrapper />;
	}

	return (
		<TenantsWrapperStyled>
			<TenantsHeader />
			<TenantsFilter />
			<TenantsGrid />

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
					tenants
				</Box>
			</Box>
		</TenantsWrapperStyled>
	);
}

export default memo(TenantsWrapper);
