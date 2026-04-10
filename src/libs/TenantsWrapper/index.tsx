"use client";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Box } from "@/components";
import { useTenantsData } from "@/hooks";
import { Pagination, TenantModal } from "@/layouts";
import { TenantsFilter, TenantsGrid, TenantsHeader } from "./components";
import { TenantsWrapperStyled } from "./styled";

function TenantsWrapper() {
	const [offset, setOffset] = useState<number>(0);
	const [pageSize] = useState<number>(12);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState("all");
	const [sortBy, setSortBy] = useState("name");
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const {
		tenants,
		stats,
		filterOptions,
		sortOptions,
		isLoading,
		mutate,
		total,
	} = useTenantsData(pageSize, offset, filterStatus, search, sortBy);

	const openAddModal = useCallback(() => setIsAddModalOpen(true), []);
	const closeAddModal = useCallback(() => setIsAddModalOpen(false), []);

	const handleTenantAdded = useCallback(async () => {
		await mutate();
	}, [mutate]);

	const totalPages = useMemo<number>(() => {
		return Math.ceil((total || 1) / pageSize);
	}, [total, pageSize]);

	return (
		<TenantsWrapperStyled>
			<TenantsHeader
				stats={stats}
				isLoading={isLoading}
				onAddTenant={openAddModal}
			/>
			{mounted && (
				<TenantModal
					open={isAddModalOpen}
					close={closeAddModal}
					mode={{ type: "add-tenant" }}
					onSuccess={handleTenantAdded}
				/>
			)}
			<TenantsFilter
				search={search}
				onSearchChange={setSearch}
				filterStatus={filterStatus}
				onFilterChange={(v) => {
					setFilterStatus(v);
					setOffset(0);
				}}
				sortBy={sortBy}
				onSortChange={setSortBy}
				filterOptions={filterOptions}
				sortOptions={sortOptions}
			/>
			<TenantsGrid tenants={tenants} isLoading={isLoading} />

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
					Showing {offset + 1}-{Math.min(offset + pageSize, total)} of{" "}
					{total} tenants
				</Box>
			</Box>
		</TenantsWrapperStyled>
	);
}

export default memo(TenantsWrapper);
